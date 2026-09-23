---
paths:
  - "src/common/file/**"
  - "src/common/aws/**"
---

# File: upload, CSV import, export, S3 presign

`FileService`, the pipes under `src/common/file/pipes/`, and `AwsS3Service` are the kit; a
feature never re-implements them, and S3 goes through `AwsS3Service`, never a hand-built
`S3Client`.

## Upload validation is a pipe

- An uploaded file is validated by a pipe composed on the route, never by an `if` in a
  controller or service. A controller does not read `file.buffer`.
- The extension allow-list is `EnumFileExtension` (`src/common/file/enums/file.enum.ts`).
  `FileExtensionPipe` reads the extension from `originalname`, then sniffs the buffer through
  `FileService.sniffExtensionFromBuffer` (`src/common/file/services/file.service.ts:72`); a
  sniffed type passes when `FileExtensionContract`
  (`src/common/file/contracts/file.extension.contract.ts`) maps it onto a member of the
  allow-list. `csv` is signature-less, so an empty sniff is accepted for it only. Adding an
  uploadable extension adds its row to that contract.
- A multi-file upload is validated element by element; one rejected file rejects the request.
- A failure throws the typed `file` exception (`FileRequiredException`,
  `FileExtensionInvalidException`, …), never a bare `BadRequestException`.

## Transport limits are the framework's, the exceptions are ours

`FileUploadSingle`, `FileUploadMultiple`, and `FileUploadMultipleFields`
(`src/common/file/decorators/file.decorator.ts`) compose `FileUploadErrorInterceptor` ahead
of the multer interceptor. It maps every multer and busboy limit failure onto a typed
exception (`FileExceedMaxSizeUploadException` 413, `FileExceedMaxFilesException`,
`FileFieldUnexpectedException`, `FileMultipartInvalidException`) by matching the framework's
own message strings, segment before the first ` - `. `FileSizeInBytes` and
`FileMaxMultiple` (`src/common/file/constants/file.constant.ts`) are the defaults;
`FileUploadMultipleFields` derives its global `files` limit from the sum of the per-field
caps. These decorators also emit the multipart OpenAPI: `ApiConsumes`, a binary `ApiBody`
from the field names, and the upload error kit.

## CSV import: the two-pipe chain

1. `FileCsvParsePipe<T>` validates a non-empty `.csv` and parses it through
   `FileService.readCsv`.
2. `FileCsvValidationPipe(schema)` validates every row against a request schema
   (`dto.md`) and collects every failure into one `FileImportException` carrying
   `{ row, errors }[]`; it never fails fast.

`file.maxDataImport` is the row cap, overridden per module through
`maxDataImportConfigKey` (`user.maxDataImport`); exceeding it throws
`FileExceedMaxDataImportException`. `FileImportException` is caught by
`AppValidationImportFilter`, maps to 422, and reports no Sentry.

## CSV and PDF export: capped, then streamed

A handler returning `IResponseFileReturn` hands `ResponseFileInterceptor`
(`src/common/response/interceptors/response.file.interceptor.ts`) a finished buffer; it caps
it, sets the download headers, and wraps it in `StreamableFile`. The row cap belongs to the
domain producing the rows (`file.maxDataExport`, overridden per module): the query asks for
`cap + 1` and the domain throws `FileExceedMaxDataExportException` before formatting.
`file.maxSizeExportInBytes` is the backstop, `FileExceedMaxSizeExportException` on the
finished buffer. `Content-Disposition` is built through `FileService.sanitizeFilename`
(`:65`) and `encodeURIComponent`, never interpolated.

## S3 presign

The browser PUTs straight to S3; the API signs and never proxies bytes. The presign DTOs
(`src/common/aws/dtos/request/`) validate `key`, `size`, and for multipart `partNumber` /
`uploadId`. `EnumAwsS3Accessibility` (`public` / `private`) is a required argument wherever
an `AwsS3Service` method reaches a bucket (`copyItem` names `accessFrom` and `accessTo`);
when in doubt, `private`. A presign signature is a credential (`security.md`): returned in the
response and nowhere else. Expiry stays short.
