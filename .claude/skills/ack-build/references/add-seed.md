# Add a seed

Invariants: `.claude/rules/seeding.md`. Reference implementation: `src/migration/seeds/migration.country.seed.ts` (data file, transaction, upsert).

## 1. Access path

Access path and what a seed may inject: `.claude/rules/seeding.md`, Outside the layering (`MigrationCountrySeed.seed` and `.remove`, `src/migration/seeds/migration.country.seed.ts`).

## 2. Data file

Data file: `.claude/rules/seeding.md`, Anatomy (`src/migration/data/migration.country.data.ts`).

## 3. Seed class

`src/migration/seeds/migration.<concern>.seed.ts`, from `MigrationCountrySeed` (`src/migration/seeds/migration.country.seed.ts`):

- The class shape: `.claude/rules/seeding.md`, Anatomy (`src/migration/bases/migration.seed.base.ts`, `src/migration/interfaces/migration.seed.interface.ts`).
- Constructor takes `protected override readonly cacheService: CacheService` first, calls `super(cacheService)`, and reads `database.seedTransactionTimeoutInMs` from `ConfigService` (the `MigrationCountrySeed` constructor).
- `seed()` opens `this.databaseService.withTransaction(async tx => { … }, { timeout })` (`MigrationCountrySeed.seed`). Every write is idempotent (`.claude/rules/seeding.md`, Idempotency and reset).
- Audit fields: `.claude/rules/seeding.md`, Anatomy (`MigrationUserSeed.seed`, `src/migration/seeds/migration.user.seed.ts`).
- `remove()` resets the collections `seed()` owns with `deleteMany` (`MigrationCountrySeed.remove`).
- A failed write: `.claude/rules/seeding.md`, Anatomy (`MigrationCountrySeed.seed`); never a bare rethrow.

## 4. Register

Add the class to the `providers` of `src/migration/migration.module.ts`, and a kit module it injects from (`AwsModule`) to its `imports`. A feature `<Module>Module` goes there only for an injection `.claude/rules/seeding.md`, Outside the layering, allows; a use-case module never does.

## 5. Place it in the scripts

Scripts: `.claude/rules/seeding.md`, Order is in the script. Quote the live `package.json` script when editing.

## 6. Verify

```bash
pnpm typecheck
pnpm exec nest build migration --config nest-cli.json   # compiles the migration project only; runs nothing
```

`src/migration/**` gets no spec (`.claude/rules/testing.md`, Layout and runs). Hand back the exact command and its place in the order.
