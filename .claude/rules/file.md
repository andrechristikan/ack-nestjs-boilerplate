# File — upload, CSV import, S3 presign

Detail in `docs/file-upload.md` and `docs/presign.md`. `FileService`, the file pipes, and `AwsS3Service` are the shared kit in `src/common/file/` and `src/common/aws/`; a feature never re-implements them.

## Upload validation is a pipe, never inline

An uploaded file is validated by a `src/common/file/pipes/` pipe, composed on the route — not by an `if` inside the controller or service.

- **Extension is an allow-list, checked against `EnumFileExtension`** (`file.enum.ts`, grouped `Image` / `Document` / `Audio` / `Video` / `Template`). Never match a raw string; add the extension to the right group enum first.
- A failed upload throws the typed file exception (`FileRequiredException`, `FileExtensionInvalidException`, …), never a bare `BadRequestException` — same rule as everywhere (`rules/exceptions.md`).
- Do not read `file.buffer` in a controller. The pipe owns parsing; the controller receives the parsed result.

## CSV import — the two-pipe chain

A CSV import endpoint composes two pipes in order, and the order is the contract:

1. **`FileCsvParsePipe<T>`** — validates the upload is a non-empty `.csv` and parses the UTF-8 buffer into raw rows via `FileService.readCsv`.
2. **`FileCsvValidationPipe<Dto>`** — `plainToInstance` + `class-validator` **per row**, collecting per-row failures into a `FileImportException` carrying `{ row, errors }[]`.

- **Row errors are collected, never fail-fast.** `FileCsvValidationPipe` validates every row and reports all failures at once — do not rewrite it to throw on the first bad row.
- **`file.maxDataImport` (config) is the row cap.** Exceeding it throws `FileExceedMaxDataImportException`. An unbounded import loads an attacker-controlled row count into memory — the cap is a limit, not a suggestion.
- `FileImportException` is `@Catch`-ed by `app.validation-import.filter.ts` (first in the filter chain, `rules/exceptions.md`). It maps to `422` with row-scoped errors and reports **no Sentry** — a bad upload is a client error. Do not route import errors anywhere else.
- The import DTO is a normal request DTO with `class-validator` decorators (`rules/validation.md`); the pipe validates rows against it with `whitelist: true, forbidNonWhitelisted: true`.

## S3 presign — the client uploads, the API only signs

A presigned upload means the browser PUTs straight to S3; the API issues a short-lived signature and never proxies the bytes.

- The presign request DTO (`AwsS3PresignRequestDto` / `AwsS3PresignPartRequestDto`) validates **`key`** and **`size`** (and `partNumber` / `uploadId` for multipart) — a presign is a signed grant, so its inputs are validated like any other wire input, never trusted raw.
- **`EnumAwsS3Accessibility` (`public` / `private`) is a security decision, not a default.** A `public` object is world-readable by URL forever. Choose it deliberately per bucket/object; when unsure it is `private`.
- **A presign signature is a credential** (`rules/security.md`): it must not land in a log line, in activity metadata, or on `request.<field>`. Return it in the response and nowhere else.
- Expiry is bounded and short. Do not widen a presign TTL to "make testing easier".
- S3 access goes through `AwsS3Service` (the one client, health-checked and config-driven), never a hand-built `S3Client` in a feature module — same single-connection discipline as the database and Redis.
