---
name: ack-add-seed
description: >-
  Procedure for adding a seed under src/migration/: the data file, the seed class with its
  seed and remove pair, audit fields, the transaction, registration in MigrationModule,
  and placement in the bundled package.json scripts. Loads when a seed, seed data, or the
  migration module is being written.
user-invocable: false
---

# Add a seed

Invariants: `.claude/rules/seeding.md`. Reference implementation:
`src/migration/seeds/migration.country.seed.ts` (data file, transaction, upsert) and
`src/migration/seeds/migration.template-notification.seed.ts` (a domain-backed seed
outside the bundled scripts).

## 1. Decide the access path

Follow the sibling seed that writes the same kind of row:

| Seed needs | Inject | Reference |
|---|---|---|
| plain rows on one model | `DatabaseService` | `src/migration/seeds/migration.country.seed.ts:30-33` |
| a feature's write rules | that feature's repository, with `<Feature>RepositoryModule` in `MigrationModule` `imports` | `src/migration/migration.module.ts:22-27` |
| a feature's domain | that feature's domain module in `imports` | `UserDomainModule`, `src/migration/migration.module.ts:25` |
| a kit service | `AwsSESService` or `AwsS3Service`, with `AwsModule` imported | `src/migration/seeds/migration.template-notification.seed.ts:27-35` |

Do not add a second path to a collection a sibling already seeds.

## 2. Data file

Static rows live in `src/migration/data/migration.<concern>.data.ts` as a PascalCase
const, keyed by `EnumAppEnvironment` when rows differ per environment
(`src/migration/data/migration.country.data.ts`). A seed whose rows carry no external key
builds them inline and has no data file.

## 3. Seed class

`src/migration/seeds/migration.<concern>.seed.ts`, from
`src/migration/seeds/migration.country.seed.ts:15-94`:

- `@Command({ name: '<concern>', description, allowUnknownOptions: false })`; `name` is
  camelCase (`apiKey`, `featureFlag`, `templateEmailNotification`).
- `class Migration<Concern>Seed extends MigrationSeedBase implements IMigrationSeed`
  (`src/migration/bases/migration.seed.base.ts:9`,
  `src/migration/interfaces/migration.seed.interface.ts`). The base owns `--type
  seed|remove`; the class implements both `seed()` and `remove()`.
- Constructor calls `super()`, reads `database.seedTransactionTimeoutInMs` from
  `ConfigService` (`:38-41`).
- `seed()` opens `this.databaseService.withTransaction(async tx => { … }, { timeout })`
  and holds statements only; hashing, key drawing, and row building happen before the
  callback (`:48-67`). Every write is an upsert, an existence check, or `createMany({
  skipDuplicates: true })`, never a blind `create`.
- Every row carries `createdBy` and `updatedBy` set to `MigrationUserSuperAdminId`
  (`src/migration/data/migration.user.data.ts:4`), on the `create` branch, the `update`
  branch, and every nested row (`:55-62`).
- `remove()` resets the collections `seed()` owns with `deleteMany` (`:78-93`).
- Log through a private `Logger`, rethrow after logging.

A seed whose fixed id may already belong to another row checks first and stops with a
message naming the email and both ids (`src/migration/seeds/migration.user.seed.ts`).

## 4. Register

Add the class to `providers` in `src/migration/migration.module.ts:28-40` and any module
it injects from to `imports` (`:22-27`). The `providers` order does not decide run order.

## 5. Place it in the scripts

Run order is the `package.json` scripts. A seed that belongs to the bootstrap set lands in
both `migration:seed` (after what it depends on) and `migration:remove` (before what
depends on it); quote the live script when editing, the remove order is not a strict
reverse. A seed that runs on demand (`templateEmailNotification`, `templateTermPolicy`,
`awsS3Config`) stays out of both and runs as `pnpm migration <name> --type seed`.

## 6. Verify

```bash
pnpm typecheck
pnpm exec nest build migration --config nest-cli.json   # compiles the migration project only; runs nothing
```

`src/migration/**` is excluded from coverage and gets no spec. Running any `migration*`
command is the owner's; hand back the exact command and the order it belongs in.
