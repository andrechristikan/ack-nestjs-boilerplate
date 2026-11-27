---
title: File Upload Guide
description: Add a multipart upload route, a CSV import route, or a presigned S3 upload flow to a feature module.
---

# File Upload Guide

This guide shows how to accept a file in a feature module, for a developer who adds an upload route. The reference implementations are `UserSharedController.uploadPhotoProfile` for a multipart upload, `UserAdminController.import` for a CSV import, and `UserProfileService` for a presigned upload.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [File Upload][ref-doc-concept-file-upload]: how the transports, the pipes, and the presign flow work
- [File Upload Reference][ref-doc-reference-file-upload]: the decorators, pipes, extensions, presign options, and errors
- [Schema Guide][ref-doc-guide-schema]: the row schema of an import and the request schema of a presign
- [Queue Guide][ref-doc-guide-queue]: the outbox effect that deletes a replaced object
- [Module Guide][ref-doc-guide-module]: the module the route belongs to

## Prerequisites

- The feature module exists ([Module Guide][ref-doc-guide-module]).
- For a presigned upload or a stored object, S3 is configured: `AWS_S3_*` keys and a bucket ([Dependencies][ref-doc-dependencies-optional]). An unset adapter makes the flow answer 501.
- The uploadable extension is in `EnumFileExtension` (`src/common/file/enums/file.enum.ts`), the union of the per-kind enums such as `EnumFileExtensionImage` and `EnumFileExtensionDocument`. A new extension adds its member to the per-kind enum and its row to `FileExtensionContract` (`src/common/file/contracts/file.extension.contract.ts`), where the row lists the signatures `file-type` reports for it, or `[]` for a text type.

## Steps

### Add a multipart upload

1. Add the upload decorator and the timeout to the route. Use `FileUploadSingle` for one file, `FileUploadMultiple` for several files in one field, and `FileUploadMultipleFields` for several named fields. Pass `{ field, fileSize }` to change the field name or the 10 MB size limit.

    - `FileUploadSingle` reads the field `file`, and `FileUploadMultiple` reads `files` with up to 3 files unless you pass `maxFiles`.
    - `FileUploadMultipleFields` takes a list of `{ field, maxFiles }` entries and has no default field names.
    - A route with several files binds them with `@UploadedFiles(...)`, and `@UploadedFile(...)` binds one file: an array for `FileUploadMultiple`, and an object keyed by field name for `FileUploadMultipleFields`.

2. Bind the file with the validation pipes in order: required, then extension. This is `uploadPhotoProfile` in `src/modules/user/controllers/user.shared.controller.ts`:

    ```typescript
    @FileUploadSingle()
    @RequestTimeout(RequestUploadTimeout)
    @HttpCode(HttpStatus.OK)
    @Post('/profile/photo/upload')
    async uploadPhotoProfile(
        // contexts omitted
        @UploadedFile(
            FileRequiredPipe(),
            FileExtensionPipe([
                EnumFileExtensionImage.jpeg,
                EnumFileExtensionImage.png,
                EnumFileExtensionImage.jpg,
            ])
        )
        file: IFile
    ): Promise<IResponseReturn<void>> {
    ```

3. Pass the `IFile` to the use case whole. Validate nothing else in the controller and never read `file.buffer` there.
4. Store the file in a service. Build the key with `FileService.createRandomFilename({ path, extension, randomLength })`, where `extension` is the validated extension of `file.originalname` (`FileService.extractExtensionFromFilename`) and `randomLength` is optional and defaults to 10. Call `AwsS3Service.putItem({ key, size, file }, { access })`, where `file` is the buffer (`file.buffer`) and `size` is `file.size`, with an explicit `EnumAwsS3Accessibility`, and throw `AwsS3NotConfiguredException` when the call returns `null`. When `access` is in doubt, use `private`.
5. When the upload replaces an object, add the delete row in the same transaction as the write that stores the new key ([Queue Guide][ref-doc-guide-queue]).

### Add a CSV import

1. Write the row schema as a zod strict object in the module's `dtos/request/`, with one field per CSV column ([Schema Guide][ref-doc-guide-schema]).
2. Add the row cap to the module's config as `<module>.maxDataImport` (`user.maxDataImport` in `src/configs/user.config.ts`) when it differs from `file.maxDataImport`. Without `maxDataImportConfigKey`, the pipe uses `file.maxDataImport`. A CSV over the cap answers 422 with `FileExceedMaxDataImportException`.
3. Add `@FileImportSingle()` and `@RequestTimeout(RequestUploadTimeout)` to the route, and chain the four pipes on the file. This is `import` in `src/modules/user/controllers/user.admin.controller.ts`:

    ```typescript
    @FileImportSingle()
    @RequestTimeout(RequestUploadTimeout)
    @HttpCode(HttpStatus.OK)
    @Post('/import')
    async import(
        // contexts omitted
        @UploadedFile(
            FileRequiredPipe(),
            FileExtensionPipe([EnumFileExtensionDocument.csv]),
            FileCsvParsePipe,
            FileCsvValidationPipe(UserImportRequestSchema, {
                maxDataImportConfigKey: 'user.maxDataImport',
            })
        )
        data: UserImportRequestDto[]
    ): Promise<IResponseReturn<UserImportResponseDto>> {
    ```

4. Take the validated rows as the use case's argument. A row that fails never reaches it, because the pipe throws one `FileImportException` with every failing row.

### Add a presigned upload

1. Add a route that returns a presign. The service refuses a size above the module's limit, builds a random key under a path the user owns, and calls `AwsS3Service.presignPutItem({ key, size }, { forceUpdate, access })`. With `forceUpdate` unset or `false`, the call refuses a key that already holds an object, and `true` allows an overwrite. It throws `AwsS3NotConfiguredException` when the result is `null` (`UserProfileService.generatePhotoProfilePresign`).
2. Return the `IAwsS3Presign` the call gives. The client PUTs to `presignUrl` with exactly the returned `mime` as its content type.
3. Add a route that confirms the key. Both presign routes bind a request schema with `@Body({ schema })` and use no file decorator or pipe. The confirm body holds the key and no size. The service verifies, before any write:
    1. The key sits under the owner's path (`UserProfileService.isPhotoProfileKeyOwned`), or it throws the module's own 400 (`UserPhotoKeyInvalidException`).
    2. The object exists and its size is within the limit (`AwsS3Service.checkItem`). The size is the one S3 reports, never one the request states. A missing object answers the same 400 `UserPhotoKeyInvalidException`.
    3. The first bytes match the extension: read them with `AwsS3Service.getItemBytes(key, FileSniffSizeInBytes, { access })` and check them with `FileService.isContentOfExtension`, with the extension that `checkItem` returns from the key.
    4. Run the object and bytes reads together, as `UserProfileService.checkPhotoProfile` does, and return the size and content verdicts without writing.
4. Add the delete row of an object refused for its size or its content in a transaction that holds that row alone, then throw the module's refusal, the size one first (`UserPhotoSizeExceededException` 400, then `UserPhotoContentInvalidException` 415). `UserUpdatePhotoProfileUseCase` sequences `isPhotoProfileRejected`, `deleteRejectedPhotoInTx`, and the two assert methods. Add the delete row of a replaced object in the transaction that stores the new key.

## Check the result

1. Call the route from Swagger at `http://localhost:3000/docs`, with a valid file. The route answers 200.
2. Repeat with a wrong file and compare:
    - A file of another extension, or a renamed file whose bytes do not match, answers 415.
    - A file over the size limit answers 413.
    - A call with no file answers 422.
    - A CSV with an invalid row answers 422 with one entry per failing row, each with its row index.
3. For a presigned upload, call the presign route, PUT a file with `content-type` set to the returned `mime`, and call the confirm route with the key. A valid file answers 200. A key outside the owner's path, a key with no object, and an object over the size limit answer 400, and a file whose bytes do not match its extension answers 415. A refused object disappears from the bucket when the module's delete job completes.
4. For a stored object, open the bucket and find the key. After a replacement, the previous key disappears when the module's own delete job completes, such as `deletePhoto` or `deleteContent`.

## Related tasks

- [Queue Guide][ref-doc-guide-queue]: add the job that deletes an object
- [Status Code Guide][ref-doc-guide-status-code]: add the exception a confirm step throws
- [API Documentation Guide][ref-doc-guide-api-documentation]: describe the route

<!-- REFERENCES -->

[ref-doc-concept-file-upload]: ../concepts/file-upload.md
[ref-doc-reference-file-upload]: ../reference/file-upload.md
[ref-doc-dependencies-optional]: ../concepts/dependencies.md#optional-adapters
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-queue]: queue.md
[ref-doc-guide-module]: module.md
[ref-doc-guide-status-code]: status-code.md
[ref-doc-guide-api-documentation]: api-documentation.md
