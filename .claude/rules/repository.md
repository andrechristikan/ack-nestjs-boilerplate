---
paths:
    - '**/repositories/**'
    - 'prisma/**'
    - 'src/common/database/**'
---

# Repositories and schema

Who opens a transaction, guarded statements, and retries: `transaction.md`.

## Writes

- The extension stamps `createdBy` / `updatedBy` from the CLS actor (`RequestActorStoreKey`, set by the JWT guards on HTTP only) on `create`, `createMany`, `update`, `updateMany`, `upsert`, filling a field of the top-level payload only when the caller left it null. A nested write is not stamped: it passes its audit values explicitly. A processor, a seed, and a public route have no actor and do the same.
- Prisma on MongoDB matches `field: null` only where `null` is stored, so every create writes `null` into each nullable column a read filters by `null`. A soft-deletable model's live-row read filters `deletedAt: null`.
- Soft delete is `client.<model>.softDelete({ where, data? })`, restore is `restore(...)`, typed only on a model with `deletedAt`: `where`, `data`, and the result are that model's `update` types. Both stamp the audit fields. Hard `delete` writes no audit. Soft-deleting a `Workspace` or `Project` rewrites its slug to `deleted-<id>`, one statement per row; another many-row delete is one live-row `updateMany` with `deletedAt` and `deletedBy` in `data`.

## Queries

- Prisma builder only; no `$queryRaw` / `$executeRaw` in a feature repository.
- An update writes every field as given: `null-safety.md`, Update and create.

## Schema

Match the existing models: `id String @id @default(auto()) @map("_id") @db.ObjectId`; `createdAt createdBy updatedAt updatedBy` with `@updatedAt`, plus `deletedAt deletedBy` on a soft-deletable model, and `createdAt createdBy` alone on an activity-log, history, acceptance, or one-time-token row; `@@map("<PluralPascalCase>")`; camelCase fields; relation scalars `String @db.ObjectId`; an embedded shape is a composite `type`; an enum is `Enum<Module><Concept>` with camelCase members, imported from `@generated/prisma-client/client`; every index for a query that exists. The hand-back after a schema edit names the index the query needs. A persisted enum value or column rename changes the schema and every call site together.
