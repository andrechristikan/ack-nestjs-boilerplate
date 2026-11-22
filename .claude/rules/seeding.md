---
paths:
    - 'src/migration/**'
---

# Seeding

`src/migration/` holds seeds, not schema migrations: the reference and bootstrap rows an empty database needs (roles and their policies, countries, the seed API key, feature flags, term policies, the seed users and their workspaces, common passwords, the SES templates, the S3 config). A one-off production write, a column re-compute, or a historical import does not belong here, and a seed holds no business logic. Procedure for a new seed: `.claude/skills/ack-build/references/add-seed.md`.

## Anatomy

```
src/migration/
├── bases/migration.seed.base.ts   MigrationSeedBase, extends nest-commander CommandRunner
├── data/                          migration.<concern>.data.ts, PascalCase consts
├── seeds/                         migration.<concern>.seed.ts, one @Command per concern
├── enums/ · interfaces/
└── migration.module.ts            its own composition root; provides every seed
```

- A seed is `Migration<Concern>Seed`, decorated `@Command({ name, description, allowUnknownOptions: false })`, extending `MigrationSeedBase` (`src/migration/bases/migration.seed.base.ts`), whose `run` owns the `--type seed|remove` dispatch, and implementing `IMigrationSeed` (`src/migration/interfaces/migration.seed.interface.ts`): `seed()` and `remove()`, both.
- `@Command` `name` is camelCase for the concern: `apiKey`, `featureFlag`, `termPolicy`, `templateEmailNotification`, `awsS3Config`.
- A seed whose data has no external key needs no data file.
- A bulk list shared by every environment exports one PascalCase `string[]` const, its file listed in `cspell.json` `ignorePaths` (`MigrationCommonPasswordData`, the `commonPassword` seed: the first 3000 entries of its source that the password policy admits (8 to 64 characters, `credential-policy.md`), lowercased and de-duplicated, in source order (OWASP ASVS 6.2.4's minimum), named in its JSDoc, `code-style.md`). Any other data file exports a const typed by an `I*` map of `EnumAppEnvironment` declared in `src/migration/interfaces/` (`code-style.md`); a seed reads its rows, the seeded passwords and API key credentials included, as `Migration<Concern>Data[app.env]` (the `MigrationUserSeed` constructor, `src/migration/seeds/migration.user.seed.ts`).
- Every environment seeds the super admin, the admin, and the user. A literal credential (a user password, an API key) sits under `local` only, and no environment key carries a seed password. A deployed environment's user carries `password: null`: `MigrationUserSeed` draws it with `AuthPasswordService.createRandom()` and, after the commit, prints each new user's password once on `process.stdout`, never through the logger.
- A seed writes its audit fields explicitly: `createdBy` on every seeded row, and `updatedBy` on every row whose model carries it, including the update branch of an upsert and every nested row, carry `MigrationUserSuperAdminId` from `src/migration/data/migration.user.data.ts`.
- A seed's create writes `null` into each nullable column a read filters by `null` (`repository.md`).
- A missing data prerequisite (roles, countries, term policies, seeded users) logs an error and returns.
- A seed whose integration is unset logs a `warn` and returns: it checks `isInitialized()` first (`MigrationTemplateEmailNotificationSeed.seed`, `src/migration/seeds/migration.template-email-notification.seed.ts`), and `awsS3Config` also needs `AWS_S3_IAM_PRINCIPAL_ARN`. A failed write is wrapped and thrown with no log before it: `throw new AppUnknownException(error)` (`exceptions.md`, `logging.md`).
- A transaction opens through `this.databaseService.withTransaction` with `database.seedTransactionTimeoutInMs`; hashing, key drawing, and row building happen before the callback so the transaction holds only statements.

## Outside the layering

`layering.md`, `cross-module.md` (repository ownership and the one `ActivityLog` writer included), and the activity-log contract and side-effect rules (`effects.md`) do not bind a seed.

- A seed writes every model it seeds, `ActivityLog` included, through `this.databaseService.client` or the `tx` of `withTransaction`; never through a feature repository or a feature service method that writes the database.
- A seed injects `DatabaseService`, `ConfigService`, and `src/common/` kit services (`DatabaseUtil`, `HelperHashService`, `AwsS3Service`, `AwsSESService`).
- A seed injects a feature service only for work that writes no database: a non-database integration, the SES templates (`NotificationTemplateService`), or a password build (`AuthPasswordService.create`, `createRandom`).
- A seed may inject any module's util and read any contract (`ApiKeyCredentialUtil`, `ActivityLogUtil`, `UserTermPolicyContract`). The seeded user's email verification comes from `UserVerificationUtil.createVerified(email)`.
- A seed injects no queue class and adds no request side effect.
- `MigrationModule` imports `CommonModule` and the kit modules its seeds use (`AwsModule`), and a feature `<Module>Module` only for an injection allowed above (`NotificationModule` for the SES templates); it imports no use-case module.
- What binds a seed: `naming.md`, `code-style.md`, `injectable.md`, `null-safety.md`, `concurrency.md`, `discipline.md`, and this file.

## Term policies

The `termPolicy` seed publishes version 1 of every `EnumTermPolicyType`, `publishedAt` set, each with an `en` content at key `term-policies/<type>/v1/en-<random>.hbs` (`termPolicy.uploadContentPathPattern`, `TermPolicyUtil.getContentKey`).

- When `AwsS3Service.isInitialized()`, it uploads the content to the private bucket and copies it to the public one; otherwise it logs a `warn` and still writes the complete row.
- It fails when a required type (`termsOfService`, `privacy`) is not published after the run.
- `nest-cli.json` `assets` (`**/**/templates/*`) copies the term-policy templates to `dist/modules/term-policy/templates/`; the seed runs from `dist/migration/seeds/` and reads `join(import.meta.dirname, '../../modules/term-policy/templates', <file>)`.

## Order is in the script

`package.json` `migration:seed` and `migration:remove` define the run order; the `providers` array does not. Quote the live scripts when editing them. `migration:remove` is not a strict reverse of `migration:seed`. Seeds registered but outside both scripts (`templateEmailNotification`, `awsS3Config`) run as separate `migration` commands on purpose. A new seed with a dependency lands in both scripts.

## Idempotency and reset

`seed()` is safe against a database that already holds its rows: an `upsert` on a unique key, or an existence check (`findMany` on the keys, then `createMany` of the missing rows), never a blind `create`. A seed is seed-once: an upsert `update` writes `updatedBy` only, so changed seed data reaches the database through `migration:fresh`. Prisma on MongoDB has no `skipDuplicates` on `createMany`. `remove()` resets the collections its `seed()` owns outright. `MigrationSeedBase` ends every run with `CacheService.flush()` after `seed()` or `remove()`; a seed invalidates no cache key itself.

## Off-limits

`migration:fresh` resets the database before it seeds. `migration:build` compiles `dist/migration.js` and the other scripts build nothing: a host run builds first, and the `apis` container runs them on the `dist/` its watcher compiled.
