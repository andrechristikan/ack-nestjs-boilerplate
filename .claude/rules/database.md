---
paths:
  - "**/repositories/**"
  - "prisma/**"
  - "src/common/database/**"
---

# Database

## Access

- Inject `DatabaseService` (`src/common/database/services/database.service.ts`), never
  `PrismaClient`. It exposes `client`, the audited extended Prisma client, and `withTransaction`
  (`:51`). Only a repository issues a model query on `client`; the exceptions are seeds
  (`seeding.md`) and the health indicators.
- `client` is built once by `DatabaseClientFactory.create()` with the extension from
  `DatabaseExtensionUtil.build()` (`src/common/database/utils/database.extension.util.ts`). Its return type
  stays inferred (`ts/database-inferred-client` in `eslint.config.mjs`); annotating it erases `softDelete` and
  `restore`. `DatabaseService` injects the raw factory only because an extended client has no `$on`.
- The extension stamps `createdBy` / `updatedBy` from the CLS actor (`RequestActorStoreKey`, set by
  `RequestActorInterceptor` on HTTP requests only) on `create`, `createMany`, `update`, `updateMany`, `upsert`,
  filling a field only when the caller left it null. Nested writes are stamped against the related model
  through `DatabaseModelRelations` (`src/common/database/constants/database.constant.ts`), typed against
  `Prisma.TypeMap`, so a new relation fails `pnpm typecheck` until listed. A processor, a seed, and a public
  route have no actor and pass audit values explicitly.
- Reads are not filtered: a read against a soft-deletable model carries `deletedAt: null`.
- Soft delete is `client.<model>.softDelete({ where, data? })` (`database.extension.util.ts:274`),
  restore is `restore(...)` (`:294`); both stamp the audit fields. Hard `delete` writes no audit.
  There is no `softDeleteMany`: many rows is one `updateMany` filtered to live rows
  (`OR: <Model>ActiveFilter`) with `deletedAt` and `deletedBy` in `data`
  (`src/modules/project/repositories/project.repository.ts:169`).
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds `checkIdIsValid` and
  `createId`. Domain and HTTP pass `string` ids; the ObjectId dialect stays in the repository.

## Queries

- Prisma builder only; no `$queryRaw` / `$executeRaw` in a feature repository.
- `select` shapes are PascalCase constants in `<module>.constant.ts`.
- The repository owns `null → {}` normalization of filter params.
- `orderBy` direction is `Prisma.SortOrder` or `EnumPaginationOrderDirectionType`.
- A check-then-act is a race unless a unique index enforces it; where no index backs the invariant, say so.

## Generated unique values

A slug, reference, or random column behind a unique index is retried a bounded number of times from a
`*MaxAttempts` config key and throws `DatabaseUniqueValueGenerationFailedException` (`51800`) when the budget
runs out; a raw `P2002` never escapes as the exhaustion signal, and a `P2002` on another column is rethrown
untouched. A value the request supplies fails on the first collision with the feature's own exception. The
retry sits with whoever owns the transaction. This is the one typed exception a repository throws.

## Transactions

Every transaction opens through `DatabaseService.withTransaction(fn, options?)`, Prisma's
interactive `$transaction` on the audited client; every statement inside uses `tx`. Who opens it:
the repository when every statement is on its own model; the domain when the write spans
repositories, calling each as `*InTx(tx, ...)`. A method that joins a caller-owned transaction is
named `*InTx` with `tx: IDatabaseTransactionClient` first; one without the suffix takes no `tx`, and
there is no `tx?` fallback (`create` and `createInTx` are siblings). A single-statement write opens
no transaction; `updateMany` / `createMany` do. `options` come only from the caller's own
`*TimeoutInMs` key (`database.seedTransactionTimeoutInMs`, a bulk import). A write conflict
(`P2034`) is not retried. MongoDB transactions need the replica set `docker-compose.yml` runs.

## Dates

`HelperDateService` (`src/common/helper/services/helper.date.service.ts`) owns the clock; `new Date()` in a
service, guard, util, or repository is a defect (Prisma `@default(now())` and a spec fixture excepted).
Persisted timestamps are Prisma `DateTime`; a date on the wire is serialized by the response schema; compare
`Date` objects, not strings. A duration is a config key in the consumer's unit (`config.md`). `updatedAt`,
`lastActiveAt`, and a resent `expiredAt` are mutable sort keys and illegal on a cursor route (`dto.md`).

## Schema

`prisma/schema.prisma` is editable; applying it is the owner's and there are no migration files (`AGENTS.md`).
Match the existing models: `id String @id @default(auto()) @map("_id") @db.ObjectId`; `createdAt createdBy
updatedAt updatedBy` with `@updatedAt`, plus `deletedAt deletedBy` on a soft-deletable model;
`@@map("<PluralPascalCase>")`; camelCase fields; relation scalars `String @db.ObjectId`; enums declared in the
schema and imported from `@generated/prisma-client/client`; every index for a query that exists. The hand-back
after a schema edit names the push as the owner's step, the data consequence for existing rows, and the index
the query needs. A persisted enum value or column rename is a data migration.
