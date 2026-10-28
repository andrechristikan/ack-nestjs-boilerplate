---
paths:
    - 'src/migration/**'
---

# Seeding

`src/migration/` holds seeds, not schema migrations: the reference and bootstrap rows an empty database needs (roles, countries, the seed API key, feature flags, term policies, templates, the S3 config, the seed user). There are no migration files and applying the schema is the owner's (`AGENTS.md`). A one-off production write, a column re-compute, or a historical import does not belong here, and a seed holds no business logic. Procedure for a new seed: `.claude/skills/ack-build/references/add-seed.md`.

## Anatomy

```
src/migration/
├── bases/migration.seed.base.ts   MigrationSeedBase, extends nest-commander CommandRunner
├── data/                          migration.<concern>.data.ts, PascalCase consts
├── seeds/                         migration.<concern>.seed.ts, one @Command per concern
├── enums/ · interfaces/
└── migration.module.ts            its own composition root; provides every seed
```

- A seed is `Migration<Concern>Seed`, decorated `@Command({ name, description, allowUnknownOptions: false })`, extending `MigrationSeedBase` (`src/migration/bases/migration.seed.base.ts:9`), which owns the `--type seed|remove` dispatch, and implementing `IMigrationSeed` (`src/migration/interfaces/migration.seed.interface.ts`): `seed()` and `remove()`, both.
- `@Command` `name` is camelCase for the concern: `apiKey`, `featureFlag`, `termPolicy`, `templateEmailNotification`, `templateTermPolicy`, `awsS3Config`.
- Static rows live in `data/` as PascalCase consts; a seed whose data has no external key needs no data file.
- A seed writes its audit fields explicitly: no request actor exists in a command, so `createdBy` and `updatedBy` on every seeded row, including the update branch of an upsert and every nested row, carry `MigrationUserSuperAdminId` from `src/migration/data/migration.user.data.ts`.
- A missing data prerequisite (roles, countries, term policies, seeded users) logs an error and returns. A seed that finds its fixed id taken by a different row does the same, naming the email and both ids; realigning is the owner's `migration:remove` then `migration:seed`.
- A seed whose integration is unset logs a `warn` and returns: it checks `isInitialized()` first (`migration.template-notification.seed.ts:41`), and `awsS3Config` also needs `AWS_S3_IAM_ARN`. A failed write is wrapped and thrown with no log before it: `throw new AppUnknownException(error)` (`exceptions.md`, `logging.md`).
- A transaction opens through `this.databaseService.withTransaction` with `database.seedTransactionTimeoutInMs`; hashing, key drawing, and row building happen before the callback so the transaction holds only statements.

## Outside the layering

`src/migration/` does not follow the `src/` architecture. `layering.md`, `cross-module.md` (repository ownership and the one `ActivityLog` writer included), and the activity-log contract and side-effect rules (`security.md` Activity log, `exceptions.md` Side effects) do not bind a seed; a seed writing a model directly is the convention, not a finding.

- A seed writes every model it seeds, `ActivityLog` included, through `this.databaseService.client` or the `tx` of `withTransaction`; never through a feature repository or a feature domain method that writes the database.
- A seed injects `DatabaseService`, `ConfigService`, and `src/common/` kit services (`DatabaseUtil`, `HelperHashService`, `AwsS3Service`, `AwsSESService`).
- A seed injects a feature domain for two uses only: a non-database integration, an S3 upload or SES templates (`TermPolicyTemplateDomain`, `NotificationTemplate*Domain`); and a method that computes in memory and touches no database (`UserVerificationDomain.verificationCreateVerification`). A seed injects no feature repository.
- A seed may inject any feature util or cache and read any contract (`ApiKeyCredentialUtil`, `ApiKeyCache`, `AuthPasswordUtil`, `ActivityLogUtil`, `UserTermPolicyContract`).
- A seed injects no queue class and stages no request side effect.
- `MigrationModule` imports `CommonModule` and the kit modules its seeds use (`AwsModule`), and a feature domain module only for an injection allowed above; it imports no feature repository module.
- What binds a seed: `naming.md`, `code-style.md`, `null-safety.md`, `concurrency.md`, and this file.

## Order is in the script

`package.json` `migration:seed` and `migration:remove` define the run order; the `providers` array does not. Quote the live scripts when editing them. `migration:remove` is not a strict reverse of `migration:seed`. Seeds registered but outside both scripts (`templateEmailNotification`, `templateTermPolicy`, `awsS3Config`) run as separate `migration` commands on purpose. A new seed with a dependency lands in both scripts.

## Idempotency and reset

`seed()` is safe against a database that already holds its rows: an `upsert` on a unique key, or an existence check (`findMany` on the keys, then `createMany` of the missing rows), never a blind `create`. Prisma on MongoDB has no `skipDuplicates` on `createMany`. `remove()` resets the collections its `seed()` owns outright; it is destructive by design.

## Off-limits

Every `migration*` command is the owner's to run (`AGENTS.md`); `migration:fresh` resets the database before it seeds. Write the seed; hand back the command.
