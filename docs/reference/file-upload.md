---
title: File Upload Reference
description: The upload decorators, validation pipes, allowed extensions, limits, presign options, and file errors.
---

# File Upload Reference

This page lists the facts of the file kit, for a developer who looks up a decorator, a pipe, an extension, a limit, or an error.

## Table of Contents

- [Related Documents](#related-documents)
- [Decorators](#decorators)
- [Pipes](#pipes)
- [Extensions](#extensions)
- [Limits](#limits)
- [FileService](#fileservice)
- [Presign](#presign)
- [Errors](#errors)

## Related Documents

- [File Upload][ref-doc-concept-file-upload]: how the transports, pipes, and presign flow work
- [File Upload Guide][ref-doc-guide-file-upload]: add an upload, an import, or a presigned upload
- [Status Codes][ref-doc-reference-status-codes-file]: the numeric code and message of each file error
- [Configuration Reference][ref-doc-reference-configuration-file]: the `file` and `aws` keys
- [Middleware][ref-doc-reference-middleware-upload]: the upload interceptors

## Decorators

Every decorator applies `ApiConsumes('multipart/form-data')`, a Swagger `ApiBody`, `DocErrors(...FileUploadDocErrors)`, `FileUploadErrorInterceptor`, and a multer interceptor with the limits below. Each is exported from `src/common/file/decorators/file.decorator.ts`. `FileUploadDocErrors` holds seven entries: `extensionInvalid` (415), `required`, `requiredExtractFirst`, `exceedMaxFiles`, `fieldUnexpected`, and `multipartInvalid` (422), and `exceedMaxSizeUpload` (413).

| Decorator | Options | Default field | File limit |
| --- | --- | --- | --- |
| `FileUploadSingle` | `{ field, fileSize }` | `file` | 1 |
| `FileImportSingle` | `{ field, fileSize }`, passed to `FileUploadSingle` | `file` | 1 |
| `FileUploadMultiple` | `{ field, fileSize, maxFiles }` | `files` | `maxFiles`, default `FileMaxMultiple` |
| `FileUploadMultipleFields` | `fields: { field, maxFiles }[]`, then `{ fileSize }` | each field | the sum of the `maxFiles` of every field |

- `fileSize` defaults to `FileSizeInBytes` in every decorator, `FileImportSingle` included: it has no size default of its own.
- `maxFiles` of a `FileUploadMultipleFields` entry is required and has no default.
- `FileImportSingle` adds `FileImportDocErrors`, the entries of `FileImportException` and `FileExceedMaxDataImportException`.
- `FileUploadErrorInterceptor` maps these multer and busboy errors: a file over the size limit becomes `FileExceedMaxSizeUploadException`, a file count over the limit becomes `FileExceedMaxFilesException`, an unexpected field becomes `FileFieldUnexpectedException`, and every other multipart limit or malformed-body error becomes `FileMultipartInvalidException`.
- The request schemas `FileUploadSingleRequestSchema` and `FileUploadMultipleRequestSchema` describe the body for Swagger.

## Pipes

Each pipe is exported from `src/common/file/pipes/`.

| Pipe | Form | Takes | Throws |
| --- | --- | --- | --- |
| `FileRequiredPipe` | `FileRequiredPipe()` | nothing | `FileRequiredException` on an empty value, an empty object, or an empty array |
| `FileExtensionPipe` | `FileExtensionPipe(allowed)` | an `EnumFileExtension[]` | `FileExtensionInvalidException` on a missing name, an extension outside the list, or content that does not match the extension |
| `FileCsvParsePipe` | the class itself | nothing | `FileRequiredException` on an empty buffer, `FileExtensionInvalidException` on a name that is not `.csv` |
| `FileCsvValidationPipe` | `FileCsvValidationPipe(schema, { maxDataImportConfigKey })` | a standard-schema zod schema and an optional config key | `FileRequiredExtractFirstException` with no rows, `FileExceedMaxDataImportException` over the cap, `FileImportException` with every failing row |

- `FileRequiredPipe` and `FileExtensionPipe` share `FileUtil.isEmptyInput` (`src/common/file/utils/file.util.ts`), which `FileModule` provides and exports.
- `FileExtensionPipe` validates every file of a single file, an array, or a `FileUploadMultipleFields` field map (`IFileFieldMap`), and one rejected file rejects the request.
- `FileCsvParsePipe` returns the parsed rows. `FileService.readCsv` reads a `;` delimiter and a header row, skips empty lines, and turns an empty cell into `null`.
- `FileCsvValidationPipe` reads its row cap from `maxDataImportConfigKey`, else `file.maxDataImport`, and validates the rows in batches of `file.importValidationConcurrency`: the batches run in turn and the rows of one batch run concurrently.
- `FileImportException` carries `errors`, a list of `{ row, errors }`: `row` is the zero-based index among the data rows, so the first row under the header is `0`, and `errors` holds the row's issues.

## Extensions

`EnumFileExtension` is the union of five per-kind enums. `FileExtensionContract` (`src/common/file/contracts/file.extension.contract.ts`) lists the signatures `file-type` reports for each extension. A sniffed type passes only when it is in the list, and an empty list means no signature. `FileService.isContentOfExtension` answers `true` when the sniffed type is in the list, or when nothing is sniffed and the list is empty. It answers `false` for a sniffed type outside the list, for nothing sniffed against a non-empty list, and for an extension with no row.

| Extension | Kind enum                   | Accepted signatures |
| --------- | --------------------------- | ------------------- |
| `jpg`     | `EnumFileExtensionImage`    | `jpg`               |
| `jpeg`    | `EnumFileExtensionImage`    | `jpg`               |
| `png`     | `EnumFileExtensionImage`    | `png`               |
| `pdf`     | `EnumFileExtensionDocument` | `pdf`               |
| `csv`     | `EnumFileExtensionDocument` | none                |
| `mpeg`    | `EnumFileExtensionAudio`    | `mp3`               |
| `m4a`     | `EnumFileExtensionAudio`    | `m4a`               |
| `mp3`     | `EnumFileExtensionAudio`    | `mp3`               |
| `mp4`     | `EnumFileExtensionVideo`    | `mp4`               |
| `hbs`     | `EnumFileExtensionTemplate` | none                |

## Limits

| Limit | Value | Source | Kind | Applied by |
| --- | --- | --- | --- | --- |
| Size of one uploaded file | 10 MB | `FileSizeInBytes` | constant | the multer interceptor of each upload decorator |
| Files in one multiple upload | 3 | `FileMaxMultiple` | constant | `FileUploadMultiple`, unless the route passes `maxFiles` |
| Bytes read to sniff a type | 4100 | `FileSniffSizeInBytes` | constant | the `getItemBytes` read of a presigned confirm step |
| Upload request timeout | `1m` | `RequestUploadTimeout` | constant | `@RequestTimeout(RequestUploadTimeout)` on the route |
| Rows in one CSV import | 100 | `file.maxDataImport` | config key | `FileCsvValidationPipe`, or the key the route passes as `maxDataImportConfigKey` |
| Rows in one CSV export | 1000 | `file.maxDataExport` | config key | `ResponseFileInterceptor`, or the key the route passes to `ResponseFile` as `maxDataExportConfigKey` |
| Size of an export response | 2 MB | `file.maxSizeExportInBytes` | config key | `ResponseFileInterceptor` |
| Rows validated per batch, concurrently | 10 | `file.importValidationConcurrency` | config key | `FileCsvValidationPipe` |
| Rows in a user import | 50 | `user.maxDataImport` | config key | `FileCsvValidationPipe` on the user import route |
| Rows in a user export | 5000 | `user.maxDataExport` | config key | `UserImportService` |
| Size of a profile photo | 2 MB | `user.photo.maxSizeInBytes` | config key | `UserProfileService` |
| Size of a term-policy content file | 10 MB | `termPolicy.content.maxSizeInBytes` | config key | `TermPolicyUtil.isContentSizeAllowed` |
| Presign lifetime | 30 minutes | `aws.s3.presignExpiresInSeconds` | config key | `AwsS3Service` presign methods |
| Export object lifetime under `temporary/` | 1 day | `aws.s3.temporaryExpiresInDays` | config key | the bucket lifecycle rule |

## FileService

| Method | Takes | Returns |
| --- | --- | --- |
| `readCsv(file)` | `file`, the CSV text as a string | the rows as objects, with `;` as delimiter and the first line as header |
| `writeCsv(rows)` | an array of objects | the CSV text with `;` as delimiter and formula cells escaped |
| `createRandomFilename({ prefix?, path?, extension, randomLength? })` | the parts of a name | `<path>/<prefix>-<random>.<extension>` with no leading slash, the extension lower-cased, the random part 10 characters by default. A part left out drops its segment: with no `path` and no `prefix` the result is `<random>.<extension>` |
| `extractExtensionFromFilename(filename)` | a file name | the lower-case text after the last dot |
| `extractMimeFromFilename(filename)` | a file name | the lower-case MIME type, or `null` with no dot |
| `extractFilenameFromPath(filePath)` | a path | the last segment |
| `sanitizeFilename(filename)` | a file name | the name without non-printable characters, double quotes, slashes, and backslashes |
| `sniffExtensionFromBuffer(buffer)` | the bytes | the extension `file-type` detects, or `null` |
| `isContentOfExtension(buffer, extension)` | the bytes and a declared extension | `true` when the sniffed type is in the extension's signature list in `FileExtensionContract`, or when nothing is sniffed and the list is empty; otherwise `false` |

## Presign

`presignPutItem`, `presignPutItemPart`, and `presignGetItem` return `null` when the S3 adapter is unset, and the calling service turns the `null` into `AwsS3NotConfiguredException`. `mapPresign` makes no S3 call and never returns `null`. Every method below throws `AwsS3KeyInvalidException` for a key that starts with `/`.

| Method | Takes | Options | Result |
| --- | --- | --- | --- |
| `presignPutItem` | `{ key, size }` | `{ access, forceUpdate?, expiredInSeconds? }` | `IAwsS3Presign` |
| `presignPutItemPart` | `{ key, size, uploadId, partNumber }` | `{ access, expiredInSeconds? }` | `IAwsS3PresignPart` |
| `presignGetItem` | `key` | `{ access, expiredInSeconds? }` | `IAwsS3Presign` |
| `mapPresign` | `{ key, size }` | `{ access }` | `IAwsS3`, the stored-object shape, built with no S3 call |

- `access` is a required `EnumAwsS3Accessibility`, `public` or `private`.
- `expiredInSeconds` defaults to `aws.s3.presignExpiresInSeconds`.
- The signed content type is the MIME type of the key's extension, or `application/octet-stream` when the extension has none.
- `presignPutItem` signs `content-type`, `content-length`, and `host`, so the client PUTs with `content-type` set to the returned `mime` and no other signed header. It throws `AwsS3ObjectExistException` when the object exists, unless `forceUpdate` is `true`.
- Encryption at rest is the bucket default (SSE-S3). `AwsS3Service.putItem` stores the object with `ContentType` set to the mime of the key.
- The `S3Client` takes `requestChecksumCalculation: 'WHEN_REQUIRED'`, so a presigned PUT carries no checksum.
- `presignPutItemPart` signs one part of a multipart upload that `createMultiPart` started, and signs `host` only.
- The multipart methods (`createMultiPart`, `putItemMultiPart`, `presignPutItemPart`, `completeMultipart`, `abortMultipart`) declare no checksum algorithm, so S3 attaches its default checksum: algorithm `CRC64NVME`, reported as the `ChecksumCRC64NVME` field with `ChecksumType` `FULL_OBJECT`. No feature calls them.

`IAwsS3Presign` fields: `key`, `mime`, `extension`, `presignUrl`, and `expiredInSeconds`. `IAwsS3PresignPart` adds `partNumber` and `size`.

`IAwsS3` fields: `bucket`, `key`, `mime`, `extension`, `access`, `size`, `completedUrl`, `cdnUrl` (`null` for a bucket with no CDN), and an optional `data` with the body accessors `transformToString`, `transformToByteArray`, and `transformToWebStream`.

The request schemas are in `src/common/aws/dtos/request/`:

| Schema | Field | Rule |
| --- | --- | --- |
| `AwsS3PresignRequestSchema` | `key` | 1 to 1024 characters matching `AwsS3ObjectKeyRegex`: letters, digits, `.`, `_`, `/`, `-`, no leading `/`, no `//`, no `..` |
| `AwsS3PresignRequestSchema` | `size` | an integer of at least 1, in bytes: the size of the whole object for `presignPutItem`, the signed `ContentLength` |
| `AwsS3PresignPartRequestSchema` | `key`, `size` | the same rule, with `size` the size of the part |
| `AwsS3PresignPartRequestSchema` | `partNumber` | an integer from 1 to `AwsS3MaxPartNumber` (10000) |
| `AwsS3PresignPartRequestSchema` | `uploadId` | 1 to 1024 characters |

Other `AwsS3Service` methods a flow uses: `putItem({ key, size, file }, { access, forceUpdate? })`, `checkItem(key, { access })`, which returns the `IAwsS3` of the object (`size` is its `ContentLength`) or `null` for an unset adapter, `getItemBytes(key, bytes, { access })`, `deleteItem(key, { access })`, `copyItem(source, destination, { accessFrom, accessTo })`, `isInitialized()`, and the multipart methods `createMultiPart`, `putItemMultiPart`, `completeMultipart`, and `abortMultipart`.

## Errors

The file kit's and the S3 adapter's exceptions all extend `AppBaseException`. The number and the message of each are in [Status Codes][ref-doc-reference-status-codes-file] for the `file` exceptions and [Status Codes][ref-doc-reference-status-codes-aws] for the `Aws*` ones.

| Exception | HTTP status | Raised by |
| --- | --- | --- |
| `FileRequiredException` | 422 | `FileRequiredPipe`, `FileCsvParsePipe` |
| `FileExtensionInvalidException` | 415 | `FileExtensionPipe`, `FileCsvParsePipe` |
| `FileRequiredExtractFirstException` | 422 | `FileCsvValidationPipe` with no rows |
| `FileExceedMaxDataImportException` | 422 | `FileCsvValidationPipe` over its cap |
| `FileImportException` | 422 | `FileCsvValidationPipe`, rendered by `AppValidationImportFilter` |
| `FileExceedMaxSizeUploadException` | 413 | `FileUploadErrorInterceptor` |
| `FileExceedMaxFilesException` | 422 | `FileUploadErrorInterceptor` |
| `FileFieldUnexpectedException` | 422 | `FileUploadErrorInterceptor` |
| `FileMultipartInvalidException` | 422 | `FileUploadErrorInterceptor` |
| `FileExceedMaxDataExportException` | 422 | `ResponseFileInterceptor` for a CSV over its cap, and an export request over the module's cap |
| `FileExceedMaxSizeExportException` | 422 | `ResponseFileInterceptor` for a response over `file.maxSizeExportInBytes` |
| `AwsS3NotConfiguredException` | 501 | the service that calls a method returning `null` for an unset adapter |
| `AwsS3ObjectExistException` | 409 | `presignPutItem` without `forceUpdate` |
| `AwsS3KeyInvalidException` | 500 | a presign method, `mapPresign`, `checkItem`, `deleteItem`, `deleteItems`, `createMultiPart`, `copyItem`, or `copyItems` given a key with a leading `/` |
| `AwsUnavailableException` | 503 | an S3 or SES SDK client error that is not a client fault |

<!-- REFERENCES -->

[ref-doc-concept-file-upload]: ../concepts/file-upload.md
[ref-doc-guide-file-upload]: ../guides/file-upload.md
[ref-doc-reference-status-codes-file]: status-codes.md#file
[ref-doc-reference-status-codes-aws]: status-codes.md#aws
[ref-doc-reference-configuration-file]: configuration.md#file
[ref-doc-reference-middleware-upload]: middleware.md#upload-interceptors
