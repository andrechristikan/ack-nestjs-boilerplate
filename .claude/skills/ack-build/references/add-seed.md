# Add a seed

Invariants: `.claude/rules/seeding.md`. Reference implementation: `src/migration/seeds/migration.country.seed.ts` (data file, transaction, upsert).

## 1. Access path

Inject `DatabaseService` and write every model the seed owns through `this.databaseService.client` or the `tx` of `withTransaction` (`src/migration/seeds/migration.country.seed.ts:31-34`), never through a feature repository or a feature domain method that writes. Everything else a seed may inject, and what it may not, is `.claude/rules/seeding.md`, Outside the layering.

## 2. Data file

Static rows live in `src/migration/data/migration.<concern>.data.ts` as a PascalCase const, keyed by `EnumAppEnvironment` when rows differ per environment (`src/migration/data/migration.country.data.ts`). A seed whose rows carry no external key builds them inline and has no data file.

## 3. Seed class

`src/migration/seeds/migration.<concern>.seed.ts`, from `src/migration/seeds/migration.country.seed.ts:16-93`:

- `@Command({ name: '<concern>', description, allowUnknownOptions: false })`; `name` is camelCase (`apiKey`, `featureFlag`, `templateEmailNotification`).
- `class Migration<Concern>Seed extends MigrationSeedBase implements IMigrationSeed` (`src/migration/bases/migration.seed.base.ts:9`, `src/migration/interfaces/migration.seed.interface.ts`). The base owns `--type seed|remove`; the class implements both `seed()` and `remove()`.
- Constructor calls `super()`, reads `database.seedTransactionTimeoutInMs` from `ConfigService` (`:39-41`).
- `seed()` opens `this.databaseService.withTransaction(async tx => { … }, { timeout })` and holds statements only; hashing, key drawing, and row building happen before the callback (`:48-71`). Every write is idempotent (`.claude/rules/seeding.md`, Idempotency and reset).
- Every row carries `createdBy` and `updatedBy` set to `MigrationUserSuperAdminId` (`src/migration/data/migration.user.data.ts:4`), on the `create` branch, the `update` branch, and every nested row (`:56-63`).
- `remove()` resets the collections `seed()` owns with `deleteMany` (`:78-92`).
- A failed write is wrapped and thrown with no log before it, `throw new AppUnknownException(error)` (`:70`; `.claude/rules/exceptions.md`, `.claude/rules/logging.md`); `throw new Error(...)` and a bare rethrow fail `pnpm lint`.

A seed whose fixed id may already belong to another row checks first and stops with a message naming the email and both ids (`src/migration/seeds/migration.user.seed.ts`).

## 4. Register

Add the class to `providers` in `src/migration/migration.module.ts:22-34`, and a kit module it injects from (`AwsModule`) to `imports` (`:36`). A feature domain module goes there only for an injection `.claude/rules/seeding.md`, Outside the layering, allows; a feature repository module never does. The `providers` order does not decide run order.

## 5. Place it in the scripts

Run order is the `package.json` scripts. A seed that belongs to the bootstrap set lands in both `migration:seed` (after what it depends on) and `migration:remove` (before what depends on it); quote the live script when editing, the remove order is not a strict reverse. A seed that runs on demand (`templateEmailNotification`, `templateTermPolicy`, `awsS3Config`) stays out of both and runs as `pnpm migration <name> --type seed`.

## 6. Verify

```bash
pnpm typecheck
pnpm exec nest build migration --config nest-cli.json   # compiles the migration project only; runs nothing
```

`src/migration/**` is excluded from coverage and gets no spec. Running any `migration*` command is the owner's; hand back the exact command and the order it belongs in.
