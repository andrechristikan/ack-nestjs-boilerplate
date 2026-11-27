---
title: Seed Guide
description: Push the schema, run the seeds, reset a local database, add a seed, and remove seeded data.
---

# Seed Guide

This guide shows how to push the Prisma schema to MongoDB and manage the seeds that write the reference rows, for a developer who works against a local database.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Database Reference][ref-doc-reference-database]: the seeded rows of every seed
- [Database][ref-doc-concept-database]: the client, transactions, and audit stamping a seed uses
- [Commands][ref-doc-reference-commands]: every `db:*` and `migration*` script
- [Production][ref-doc-production-seed]: seeding a deployed environment

## Prerequisites

- MongoDB runs as a replica set and both Redis instances run ([Installation][ref-doc-installation]).
- `.env` holds `DATABASE_URL`, `REDIS_CACHE_URL`, and `REDIS_QUEUE_URL`. A seed builds the same `CommonModule` as the API and validates the whole `.env`.
- The packages are installed and the Prisma client is generated (`pnpm generate`).

## Steps

Each task below is its own numbered list. Run the first task once on a fresh database, then any other task on its own.

### Seed a database

1. Push the schema. The project has no migration files, so this applies `prisma/schema.prisma` as it is:

    ```bash
    pnpm db:migrate
    ```

2. Build the seed commands. They run from `dist/migration.js`, which only this script creates:

    ```bash
    pnpm migration:build
    ```

3. Run every seed. `pnpm migration:seed` runs `apiKey`, `country`, `featureFlag`, `role`, `policy`, `termPolicy`, `user`, `workspace`, and `commonPassword`, in that order:

    ```bash
    pnpm migration:seed
    ```

    - Every seed is safe to run again. `apiKey`, `country`, `featureFlag`, `role`, `policy`, `termPolicy`, and `user` upsert on a unique key, and the update branch writes `updatedBy` only. `commonPassword` writes only the values that are missing, and `workspace` creates a personal workspace only for a seeded user who owns none.
    - A seed whose prerequisite is missing logs a warning, writes nothing, and exits 0. A seed that throws ends the run with exit code 1 and skips the seeds after it.
    - Each seed command ends by flushing the cache Redis, so a run of nine commands flushes nine times.

### Run one seed

1. Run the command by its name:

    ```bash
    pnpm migration user --type seed
    ```

    The commands are `apiKey`, `awsS3Config`, `commonPassword`, `country`, `featureFlag`, `policy`, `role`, `templateEmailNotification`, `termPolicy`, `user`, and `workspace`.

2. For `awsS3Config` and `templateEmailNotification`, read the skip conditions first. Both depend on an optional integration, so `pnpm migration:seed` leaves them out and they run this way only:
    - `awsS3Config` skips when `AWS_S3_ACCESS_KEY_ID`, `AWS_S3_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, or `AWS_S3_IAM_PRINCIPAL_ARN` is unset. It logs `AWS S3 is not configured. Skipping AWS S3 policy seed.` or `AWS_S3_IAM_PRINCIPAL_ARN is not set. Skipping AWS S3 policy seed.`
    - `templateEmailNotification` skips when `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, or `AWS_SES_REGION` is unset. It logs `AWS SES is not configured. Skipping email template seed.`
    - A skipping seed exits 0, so the warning line in the log is the only sign.

### Reset a local database

1. Build the seed commands, because the reset seeds again from `dist/migration.js`:

    ```bash
    pnpm migration:build
    ```

2. Drop every collection, push the schema, and seed again:

    ```bash
    pnpm migration:fresh
    ```

    A seed that finds its row keeps it and writes `updatedBy` only, so a change to a seed data file reaches the database through this reset.

### Add a seed

1. Add the data to `src/migration/data/migration.<concern>.data.ts` as a `PascalCase` constant typed `IMigrationEnvironmentData<...>`, one value per `EnumAppEnvironment`. A literal credential belongs under `local` only.
2. Create `src/migration/seeds/migration.<concern>.seed.ts`. The class is `Migration<Concern>Seed`, carries `@Command({ name, description, allowUnknownOptions: false })` with a camelCase `name`, extends `MigrationSeedBase`, and implements `IMigrationSeed` with `seed()` and `remove()`. Its constructor takes `CacheService` first and calls `super(cacheService)`. `src/migration/seeds/migration.country.seed.ts` is the reference.
3. Write the rows in `seed()` through `DatabaseService.client`, or the `tx` of `withTransaction(fn, { timeout })` with `database.seedTransactionTimeoutInMs`. A seed never goes through a feature repository. Draw hashes and keys before the callback, so the transaction holds statements only.
4. Set `createdBy` on every row and `updatedBy` where the model has it, including the `update` branch of an upsert, to `MigrationUserSuperAdminId` from `src/migration/data/migration.user.data.ts`.
5. Wrap a failed write in `throw new AppUnknownException(error, 'Seeding <things> failed')`. Log a warning and return when a prerequisite row is missing.
6. Make `remove()` delete the rows the seed owns.
7. Add the class to `providers` of `src/migration/migration.module.ts`, and a kit module it injects from, such as `AwsModule`, to `imports`.
8. Add `node dist/migration.js <name> --type seed` to the `migration:seed` script in `package.json`, after the seeds it needs. Add the `--type remove` form to `migration:remove`, which runs dependents first: place it after every seed that depends on its rows and before the seeds whose rows it depends on. A seed that depends on an optional integration stays outside both scripts and runs by its command.
9. Rebuild the seed commands, then run the new seed:

    ```bash
    pnpm migration:build
    pnpm migration <name> --type seed
    ```

### Remove seeded data

1. Remove every seed. `pnpm migration:remove` runs `workspace`, `user`, `apiKey`, `featureFlag`, `country`, `policy`, `role`, `termPolicy`, and `commonPassword`, in that order, dependents first:

    ```bash
    pnpm migration:remove
    ```

2. Or remove one seed by its command:

    ```bash
    pnpm migration <command> --type remove
    ```

What `remove()` deletes, per seed:

- `apiKey`, `featureFlag`, `country`, `role`, `termPolicy`, and `commonPassword` delete every row of their models, seeded or not. `featureFlag` and `termPolicy` also delete their dependent rows.
- `policy` deletes the rows of the roles it names.
- `workspace` deletes only the seeded workspaces and their dependents.
- `user` deletes every user and every row that depends on a user, so it never belongs on a database that holds real data.
- `templateEmailNotification` deletes the SES email templates of each notification kind. It is outside `pnpm migration:remove`.
- `awsS3Config` removes nothing: its `remove()` logs that it skips and returns.

## Check the result

1. Each seed logs `<things> seeded successfully.` and the run exits 0.
2. Start the API and sign in. With `APP_ENV=local` the `user` seed writes `superadmin@mail.com`, `admin@mail.com`, and `user@mail.com`, each with the password `aaAA@123`. In every other environment each new account gets a random password that the seed prints once, under `Generated user passwords, shown once:`.
3. Each seeded user owns one personal workspace named `{username}'s workspace`, such as `superadmin's workspace`.
4. A second `pnpm migration:seed` writes no new row.
5. A new seed logs its success line and exits 0, and its rows exist in MongoDB.

## Related tasks

- [Module Guide][ref-doc-guide-module]: add a module whose empty database needs reference rows
- [Hosted Dependencies Guide][ref-doc-guide-hosted-dependencies]: run the seeds against hosted MongoDB and Redis

<!-- REFERENCES -->

[ref-doc-reference-database]: ../reference/database.md
[ref-doc-concept-database]: ../concepts/database.md
[ref-doc-reference-commands]: ../reference/commands.md#database-and-seeds
[ref-doc-production-seed]: ../production.md#schema-push-and-seed
[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-guide-module]: module.md
[ref-doc-guide-hosted-dependencies]: hosted-dependencies.md
