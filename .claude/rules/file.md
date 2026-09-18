# File — upload, CSV import, export, S3 presign

`FileService`, the file pipes, and `AwsS3Service` are the shared kit in `src/common/file/`
and `src/common/aws/`; a feature never re-implements them. Flow narrative:
`docs/file-upload.md`, `docs/presign.md` — explorer or planner.

## Upload validation is a pipe, never inline

An uploaded file is validated by a `src/common/file/pipes/` pipe, composed on the route — not by an `if` inside the controller or service.

- **Extension is an allow-list, checked against `EnumFileExtension`** (`file.enum.ts`, grouped `Image` / `Document` / `Audio` / `Video` / `Template`). Never match a raw string; add the extension to the right group enum first.
- **The declared extension and the bytes must both agree with the allow-list.** `FileExtensionPipe` reads the extension from `originalname`, then sniffs the buffer through `FileService.sniffExtensionFromBuffer`. A sniffed type is accepted when `FileExtensionContract` (`contracts/file.extension.contract.ts`) maps it onto a member of the allow-list. `csv` is the signature-less member: a sniff that returns nothing is accepted for it, and rejected for every other member. `hbs` is not in that table — it is not an upload. Adding an uploadable extension to a group enum means adding its row to that table.
- **A multi-file upload is validated element by element**, and one rejected file rejects the request.
- A failed upload throws the typed file exception (`FileRequiredException`, `FileExtensionInvalidException`, …), never a bare `BadRequestException` — same rule as everywhere (`rules/exceptions.md`).
- Do not read `file.buffer` in a controller. The pipe owns parsing; the controller receives the parsed result.

## Transport limits are the framework's, the exceptions are ours

`FileUploadSingle`, `FileUploadMultiple` and `FileUploadMultipleFields` compose `FileUploadErrorInterceptor` outermost, ahead of the multer interceptor it wraps. It maps every multer and busboy limit failure onto a typed file exception — `FileExceedMaxSizeUploadException` (`413`), `FileExceedMaxFilesException`, `FileFieldUnexpectedException`, `FileMultipartInvalidException` — so a client reads the same envelope, status code and i18n message as it does for any other file error.

- The mapping matches the message strings Nest already put on the `HttpException` (`multerExceptions` / `busboyExceptions` from `@nestjs/platform-express`). It does not invent a second message catalog. The client message is the typed exception's own path (`file.error.exceedMaxSizeUpload`, …). `transformException` appends ` - <field>` to several of those framework messages, so the match is the segment before the first ` - `.
- `FileSizeInBytes` is the default per-file cap; `FileMaxMultiple` is the default file count for `FileUploadMultiple`. `FileUploadMultipleFields` takes its counts from the fields it declares.
- `FileUploadMultipleFields` derives its global `files` limit from the sum of the declared per-field `maxFiles`, so the global limit admits exactly what the per-field caps allow.

## CSV import — the two-pipe chain

A CSV import endpoint composes two pipes in order, and the order is the contract:

1. **`FileCsvParsePipe<T>`** — validates the upload is a non-empty `.csv` and parses the UTF-8 buffer into raw rows via `FileService.readCsv`.
2. **`FileCsvValidationPipe(schema)`** — validates every parsed row against a zod schema, collecting per-row failures into a `FileImportException` carrying `{ row, errors }[]`.

- **Row errors are collected, never fail-fast.** `FileCsvValidationPipe` validates every row and reports all failures at once — do not rewrite it to throw on the first bad row.
- **`file.maxDataImport` (config) is the row cap**, overridden per module through `maxDataImportConfigKey` (`user.maxDataImport`). Exceeding it throws `FileExceedMaxDataImportException`. An unbounded import loads an attacker-controlled row count into memory — the cap is a limit, not a suggestion.
- `FileImportException` is `@Catch`-ed by `app.validation-import.filter.ts` (first in the filter chain, `rules/exceptions.md`). It maps to `422` with row-scoped errors and reports **no Sentry** — a bad upload is a client error. Do not route import errors anywhere else.
- The import shape is a normal request schema (`rules/validation.md`), and the pipe is handed that schema; an unknown column is rejected the same way an unknown body key is.

## CSV and PDF export — capped, then streamed

A controller returning `IResponseFileReturn` hands `ResponseFileInterceptor` a finished buffer; the interceptor caps it, sets the download headers, and wraps it in a `StreamableFile`.

- **The row cap belongs to the domain that produces the rows.** `file.maxDataExport`, overridden per module the way the import cap is (`user.maxDataExport`). The query asks for `cap + 1` rows and the domain throws `FileExceedMaxDataExportException` when it gets them, before a single row is formatted.
- **`file.maxSizeExportInBytes` is the backstop.** `ResponseFileInterceptor` measures the finished buffer and throws `FileExceedMaxSizeExportException`. It runs once the buffer exists, so it stops the send rather than the allocation — the row cap is what keeps memory bounded, and this covers the branches that have no row to count.
- **`Content-Disposition` is built, never interpolated.** The filename passes through `FileService.sanitizeFilename` for the quoted `filename=` and through `encodeURIComponent` for `filename*=UTF-8''`. A filename that reaches the header raw is a header-injection defect, not a formatting detail.
- The headers are handed to `StreamableFile` as `{ type, disposition, length }`; `ResponseMetadataService.setHeaders` adds the `x-*` metadata alongside them.

## S3 presign — the client uploads, the API only signs

A presigned upload means the browser PUTs straight to S3; the API issues a short-lived signature and never proxies the bytes.

- The presign request DTO (`AwsS3PresignRequestDto` / `AwsS3PresignPartRequestDto`) validates **`key`** and **`size`** (and `partNumber` / `uploadId` for multipart) — a presign is a signed grant, so its inputs are validated like any other wire input, never trusted raw.
- **`EnumAwsS3Accessibility` (`public` / `private`) is a required argument wherever an `AwsS3Service` method reaches a bucket.** A `public` object is world-readable by URL forever, so each call states the accessibility it means and the compiler refuses one that leaves it out; `copyItem` and `copyItems` name `accessFrom` and `accessTo` because they touch two. Where the right value is not obvious from the call, it is `private`.
- **A presign signature is a credential** (`rules/security.md`): it must not land in a log line, in activity metadata, or on `request.<field>`. Return it in the response and nowhere else.
- Expiry is bounded and short. Do not widen a presign TTL to "make testing easier".
- S3 access goes through `AwsS3Service` (the one client, health-checked and config-driven), never a hand-built `S3Client` in a feature module — same single-connection discipline as the database and Redis.
