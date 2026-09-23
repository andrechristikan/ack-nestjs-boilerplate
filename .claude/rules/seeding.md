---
paths:
  - "src/migration/**"
---

# Seeding

`src/migration/` holds seeds, not schema migrations: the reference and bootstrap rows an
empty database needs (roles, countries, the seed API key, feature flags, term policies,
templates, the S3 config, the seed user). There are no migration files and applying the
schema is the owner's (`AGENTS.md`). A one-off production write, a column re-compute, or a
historical import does not belong here, and a seed holds no business logic. Procedure for a
new seed: the `ack-add-seed` skill.

## Anatomy

```
src/migration/
├── bases/migration.seed.base.ts   MigrationSeedBase, extends nest-commander CommandRunner
├── data/                          migration.<concern>.data.ts, PascalCase consts
├── seeds/                         migration.<concern>.seed.ts, one @Command per concern
├── enums/ · interfaces/
└── migration.module.ts            its own composition root; provides every seed
```

- A seed is `Migration<Concern>Seed`, decorated `@Command({ name })`, extending
  `MigrationSeedBase` (`src/migration/bases/migration.seed.base.ts:9`), which owns the
  `--type seed|remove` dispatch; the seed implements `seed()` and `remove()`, both of them.
- `@Command` `name` is camelCase for the concern: `apiKey`, `featureFlag`, `termPolicy`,
  `templateEmailNotification`, `templateTermPolicy`, `awsS3Config`.
- Static rows live in `data/` as PascalCase consts; a seed whose data has no external key
  needs no data file.
- A seed writes its audit fields explicitly: no request actor exists in a command, so
  `createdBy` and `updatedBy` on every seeded row, including the update branch of an upsert
  and every nested row, carry `MigrationUserSuperAdminId` from
  `src/migration/data/migration.user.data.ts`. A seeded activity row follows the same
  contracts as a request (`security.md`).
- A seed that finds its fixed id taken by a different row stops with a message naming the
  email and both ids; realigning is the owner's `migration:remove` then `migration:seed`.
- A seed injects `DatabaseService`, a feature repository (with its repository module in
  `migration.module.ts` `imports`, the sanctioned crossing in `cross-module.md`), a feature
  domain, or a kit service (`AwsSESService`, `AwsS3Service`). Follow the sibling seed's access
  path; do not add a second path to the same collection.
- A transaction opens through `this.databaseService.withTransaction` with
  `database.seedTransactionTimeoutInMs`; hashing, key drawing, and row building happen before
  the callback so the transaction holds only statements.

## Order is in the script

`package.json` `migration:seed` and `migration:remove` define the run order; the `providers`
array does not. Quote the live scripts when editing them. `migration:remove` is not a strict
reverse of `migration:seed`. Seeds registered but outside both scripts
(`templateEmailNotification`, `templateTermPolicy`, `awsS3Config`) run as separate `migration`
commands on purpose. A new seed with a dependency lands in both scripts.

## Idempotency and reset

`seed()` is safe against a database that already holds its rows: an existence check, an
upsert, or `createMany({ skipDuplicates: true })`, never a blind `create`. `remove()` resets
the collections its `seed()` owns outright; it is destructive by design.

## Off-limits

Every `migration*` command is the owner's to run (`AGENTS.md`); `migration:fresh` resets the
database before it seeds. Write the seed; hand back the command.
