---
paths:
    - 'src/common/file/**'
    - 'src/common/aws/**'
---

# File: upload, CSV import, export, S3 presign

`FileService`, the pipes under `src/common/file/pipes/`, and `AwsS3Service` are the kit; a feature never re-implements them, and S3 goes through `AwsS3Service`, never a hand-built `S3Client`. Procedure: `.claude/skills/ack-build/references/add-upload.md`. The bucket is unversioned: a delete or a listing carries no `VersionId` and lists no versions, and old objects a versioned bucket keeps are no finding.

## Upload validation is a pipe

- An uploaded file is validated by pipes on `@UploadedFile(...)`, never by an `if` in a controller or service: `FileRequiredPipe()`, then `FileExtensionPipe([...])`, then for a CSV the import pair below (`UserAdminController.import`, `src/modules/user/controllers/user.admin.controller.ts`). A controller does not read `file.buffer`. An upload route carries `@RequestTimeout(RequestUploadTimeout)` (placement: `guards.md`).
- The extension allow-list is `EnumFileExtension` (`src/common/file/enums/file.enum.ts`). `FileExtensionPipe` reads the extension from `originalname`, then checks the buffer through `FileService.isContentOfExtension`: a sniffed type passes only when it belongs to the declared extension's own signature list in `FileExtensionContract` (`src/common/file/contracts/file.extension.contract.ts`). `csv` and `hbs` are signature-less: an empty sniff passes for them only, and one with a sniffed binary signature is rejected. Adding an uploadable extension adds its row to that contract.
- No scan job, quarantine state, or scanner service exists, an accepted difference from ASVS 5.4.3: the signature check vouches for an upload, and an upload type it cannot vouch for reopens the choice.
- A multi-file upload is validated element by element; one rejected file rejects the request.
- A failure throws the typed `file` exception (`FileRequiredException`, `FileExtensionInvalidException`, …), never a bare `BadRequestException`.

## CSV import: the two-pipe chain

1. `FileCsvParsePipe` validates a non-empty `.csv` and parses it through `FileService.readCsv`.
2. `FileCsvValidationPipe(schema, { maxDataImportConfigKey })` validates every row against a request schema (`dto.md`) and collects every failure into one `FileImportException` carrying `{ row, errors }[]`; it never fails fast.

`file.maxDataImport` is the row cap, overridden per module through `maxDataImportConfigKey` (`user.maxDataImport`); exceeding it throws `FileExceedMaxDataImportException`. `FileImportException` answers 422 and is caught by `AppValidationImportFilter` (`filter.md`). An import route carries `@FileImportSingle()` in place of `@FileUploadSingle()`: it adds `FileImportDocErrors`, the entries of `FileImportException` and `FileExceedMaxDataImportException`. `FileUploadSingle` takes no import option.

## CSV and PDF export

`file.maxDataExport` is the row cap, overridden per module (`user.maxDataExport`).

- An export a job produces writes its file to the private bucket under `<aws.s3.temporaryPath>/exports/`, in a folder named by the module's plural kebab-case noun as its other S3 paths use it (`exports/users/`, `user.export.pathPattern`). One bucket lifecycle rule (`AwsS3Service.settingBucketExpiredObjectLifecycle`, `aws.s3.temporaryExpiresInDays`) deletes everything under `<aws.s3.temporaryPath>/`; no delete job runs per file.
- The request asserts S3, then SES (`UserImportService.assertExportByAdminDeliverable`), then counts and throws `FileExceedMaxDataExportException` above the module's cap (`UserImportService.assertExportByAdminWithinCap`); the job reads at the cap and throws nothing (`UserImportService.exportByAdmin`).
- A file a request answers carries `@ResponseFile({ maxDataExportConfigKey })`, which applies the mixin `ResponseFileInterceptor` (`src/common/response/interceptors/response.file.interceptor.ts`): it caps the handler's `IResponseFileReturn`, sets the download headers, and wraps it in `StreamableFile`. A CSV whose `FileService.readCsv` row count exceeds the cap throws `FileExceedMaxDataExportException`, and a PDF counts no rows. `file.maxSizeExportInBytes` is checked next, `FileExceedMaxSizeExportException` on the finished buffer. `Content-Disposition` is built through `FileService.sanitizeFilename` (`src/common/file/services/file.service.ts`) and `encodeURIComponent`, never interpolated.

## S3 presign

The browser PUTs straight to S3; the API signs and never proxies bytes. The presign DTOs (`src/common/aws/dtos/request/`) validate `key`, `size`, and for multipart `partNumber` / `uploadId`. `EnumAwsS3Accessibility` (`public` / `private`) is a required argument wherever an `AwsS3Service` method reaches a bucket (`copyItem` names `accessFrom` and `accessTo`); when in doubt, `private`. A presign signature is a credential (`security.md`): a presign a request returns travels in the response and nowhere else, with a short expiry. The export download link is encrypted in the notification payload (`effects.md`, Payloads), sent by email only, and valid for `user.export.presignExpiresInSeconds`. `presignPutItem` signs `content-type`: the client PUTs with exactly the returned `mime`. A service saving a presigned key reads the object's head through `AwsS3Service.getItemBytes` (`FileSniffSizeInBytes`, `src/common/file/constants/file.constant.ts`: the head `file-type` reads) and checks it with `FileService.isContentOfExtension` before any write; a refused public object is deleted (S3 deletes) before the module's 415 (`UserProfileService.updatePhotoProfile`).

## S3 deletes

An S3 object delete is a side effect: an outbox row of the module owning the object, added in the database write's transaction, or in one holding the add alone when no write happens (a presigned object refused for its content) (`effects.md`, Writing). A replaced or deleted term-policy content object and a user's previous profile photo, once a new one replaces it, are deleted this way. Saving a profile photo key outside the user's profile path (`UserProfileService.buildPhotoProfilePath`) is rejected with 400 (`UserPhotoKeyInvalidException`); the replace and the account self-delete add a photo delete only for a key `UserProfileService.isPhotoProfileKeyOwned` (`src/modules/user/services/user.profile.service.ts`) accepts.

## AWS without credentials

`AwsS3Service` and `AwsSesService` are optional adapters (`config.md`). A service that needs S3 throws `AwsS3NotConfiguredException`, either up front when `isInitialized()` is `false` (`TermPolicyService.prepareCreateByAdmin`, `src/modules/term-policy/services/term-policy.service.ts`) or on a `null` adapter result (`UserProfileService.generatePhotoProfilePresign`, `src/modules/user/services/user.profile.service.ts`); a presign, upload, or publish never succeeds without S3. `AWS_S3_ENDPOINT` and `AWS_SES_ENDPOINT` (`src/app/dtos/app.env.dto.ts`) point the clients elsewhere, S3 path-style; object URLs come from `aws.s3.baseUrlPattern` (`src/configs/aws.config.ts`).
