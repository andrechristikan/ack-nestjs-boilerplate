# Add an upload, an import, an export, or a presign

Invariants: `.claude/rules/file.md`, read whole before step 1. Reference implementations: `UserAdminController.import` (`src/modules/user/controllers/user.admin.controller.ts`) for a multipart CSV import, `UserProfileService` (`src/modules/user/services/user.profile.service.ts`) for a presign and a saved key.

1. A multipart upload: `FileUploadSingle`, `FileUploadMultiple`, or `FileUploadMultipleFields` on the route, then the pipes on `@UploadedFile(...)` in the order `file.md`, Upload validation is a pipe, gives. A new uploadable type adds its member to the per-kind enum `EnumFileExtension` spreads (`src/common/file/enums/file.enum.ts`) and its `FileExtensionContract` row.
2. A CSV import adds the two-pipe chain and its `maxDataImportConfigKey` (`file.md`, CSV import).
3. An export returns `IResponseFileReturn` under `@ResponseFile({ maxDataExportConfigKey })`; the service bounds its query at the cap plus one (`file.md`, CSV and PDF export).
4. A presigned upload takes the presign DTOs in `src/common/aws/dtos/request/` and names an `EnumAwsS3Accessibility` on every `AwsS3Service` call; the service that saves the key checks the object first (`file.md`, S3 presign).
5. A replaced or refused object is deleted through an outbox effect (`file.md`, S3 deletes; `.claude/rules/effects.md`).
6. A flow that needs S3 throws `AwsS3NotConfiguredException` while the adapter is unset (`file.md`, AWS without credentials).

Verify: the unit specs of the use case and the service; a booted call only when the dispatch names it (`.claude/skills/ack-build/references/boot.md`).
