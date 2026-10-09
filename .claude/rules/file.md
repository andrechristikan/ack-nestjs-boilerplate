---
paths:
    - 'src/common/file/**'
    - 'src/common/aws/**'
---

# File: upload, CSV import, export, S3 presign

`FileService`, the pipes under `src/common/file/pipes/`, and `AwsS3Service` are the kit; a feature never re-implements them, and S3 goes through `AwsS3Service`, never a hand-built `S3Client`.

## Upload validation is a pipe

- An uploaded file is validated by pipes on `@UploadedFile(...)`, never by an `if` in a controller or service: `FileRequiredPipe()`, then `FileExtensionPipe([...])`, then for a CSV the import pair below (`src/modules/user/controllers/user.admin.controller.ts:241`). A controller does not read `file.buffer`. An upload route carries `@RequestTimeout('1m')` (placement: `http.md`).
- The extension allow-list is `EnumFileExtension` (`src/common/file/enums/file.enum.ts`). `FileExtensionPipe` reads the extension from `originalname`, then sniffs the buffer through `FileService.sniffExtensionFromBuffer` (`src/common/file/services/file.service.ts:73`); a sniffed type passes when `FileExtensionContract` (`src/common/file/contracts/file.extension.contract.ts`) maps it onto a member of the allow-list. `csv` is signature-less, so an empty sniff is accepted for it only. Adding an uploadable extension adds its row to that contract.
- A multi-file upload is validated element by element; one rejected file rejects the request.
- A failure throws the typed `file` exception (`FileRequiredException`, `FileExtensionInvalidException`, …), never a bare `BadRequestException`.

## Transport limits are the framework's, the exceptions are ours

`FileUploadSingle`, `FileUploadMultiple`, and `FileUploadMultipleFields` (`src/common/file/decorators/file.decorator.ts`) compose `FileUploadErrorInterceptor` ahead of the multer interceptor. It maps every multer and busboy limit failure onto a typed exception (`FileExceedMaxSizeUploadException` 413, `FileExceedMaxFilesException`, `FileFieldUnexpectedException`, `FileMultipartInvalidException`) by matching the framework's own message strings, segment before the first `-`. `FileSizeInBytes` and `FileMaxMultiple` (`src/common/file/constants/file.constant.ts`) are the defaults; `FileUploadMultipleFields` derives its global `files` limit from the sum of the per-field caps. These decorators also emit the multipart OpenAPI: `ApiConsumes`, a binary `ApiBody` from the field names, and the upload error kit.

## CSV import: the two-pipe chain

1. `FileCsvParsePipe` validates a non-empty `.csv` and parses it through `FileService.readCsv`.
2. `FileCsvValidationPipe(schema, { maxDataImportConfigKey })` validates every row against a request schema (`dto.md`) and collects every failure into one `FileImportException` carrying `{ row, errors }[]`; it never fails fast.

`file.maxDataImport` is the row cap, overridden per module through `maxDataImportConfigKey` (`user.maxDataImport`); exceeding it throws `FileExceedMaxDataImportException`. `FileImportException` is caught by `AppValidationImportFilter`, maps to 422, and reports no Sentry.

## CSV and PDF export: capped, then streamed

`@ResponseFile({ maxDataExportConfigKey })` applies the mixin `ResponseFileInterceptor` (`src/common/response/interceptors/response.file.interceptor.ts`): it caps the handler's `IResponseFileReturn`, sets the download headers, and wraps it in `StreamableFile`. `file.maxDataExport` is the row cap, overridden per module through `maxDataExportConfigKey` (`user.maxDataExport`); a CSV whose `FileService.readCsv` row count exceeds it throws `FileExceedMaxDataExportException`, and a PDF counts no rows. `file.maxSizeExportInBytes` is checked next, `FileExceedMaxSizeExportException` on the finished buffer. The domain producing the rows bounds its query at `cap + 1` and throws the same row exception before formatting (`UserImportDomain.exportByAdmin`). `Content-Disposition` is built through `FileService.sanitizeFilename` (`src/common/file/services/file.service.ts:66`) and `encodeURIComponent`, never interpolated.

## S3 presign

The browser PUTs straight to S3; the API signs and never proxies bytes. The presign DTOs (`src/common/aws/dtos/request/`) validate `key`, `size`, and for multipart `partNumber` / `uploadId`. `EnumAwsS3Accessibility` (`public` / `private`) is a required argument wherever an `AwsS3Service` method reaches a bucket (`copyItem` names `accessFrom` and `accessTo`); when in doubt, `private`. A presign signature is a credential (`security.md`): returned in the response and nowhere else. Expiry stays short.

## AWS without credentials

`AwsS3Service` and `AwsSESService` are optional adapters (`config.md`). A domain that needs S3 throws `AwsS3NotConfiguredException`, either up front when `isInitialized()` is `false` (`src/modules/term-policy/domains/term-policy.domain.ts:157`) or on a `null` adapter result (`src/modules/user/domains/user.profile.domain.ts:136`); a presign, upload, or publish never succeeds without S3. `AwsSESService` passes `aws.ses.identityArn` as `SourceArn` on `send` and `sendBulk` when set. `AWS_S3_ENDPOINT` and `AWS_SES_ENDPOINT` (`src/app/dtos/app.env.dto.ts`) point the clients elsewhere, S3 path-style; object URLs come from `aws.s3.baseUrlPattern` (`src/configs/aws.config.ts`).
