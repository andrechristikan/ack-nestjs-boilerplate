---
paths:
    - '**/repositories/**'
    - 'prisma/**'
    - 'src/common/database/**'
---

# Repositories and schema

Who opens a transaction, guarded statements, and retries: `transaction.md`.

## Writes

- The extension stamps `createdBy` / `updatedBy` from the CLS actor (`RequestActorStoreKey`, set by the JWT guards on HTTP only) on `create`, `createMany`, `update`, `updateMany`, `upsert`, filling a field of the top-level payload only when the caller left it null. A nested write is not stamped: it passes its audit values explicitly. A processor, a seed, and a public route have no actor: a row that names a user passes it explicitly; a system row (a nonce, a snapshot, an outbox row) leaves `createdBy` unset.
- Prisma on MongoDB matches `field: null` only where `null` is stored, so every create writes `null` into each nullable column a read filters by `null`. A soft-deletable model's live-row read filters `deletedAt: null`.
- A soft delete with no guard is `client.<model>.softDelete({ where, data? })`, a guarded one a live-row `updateMany` with `deletedAt` and `deletedBy` in `data`; restore is `restore(...)`. The two extension methods are typed only on a model with `deletedAt`: `where`, `data`, and the result are that model's `update` types. Both stamp the audit fields. Hard `delete` writes no audit. Soft-deleting a `Workspace` or `Project` rewrites its slug to `deleted-<id>`, one statement per row; another many-row delete is one live-row `updateMany` with `deletedAt` and `deletedBy` in `data`.

## Queries

- A repository outside `src/modules/analytic/` uses the Prisma builder: no `aggregateRaw`, `findRaw`, `$queryRaw`, or `$executeRaw`. `$runCommandRaw({ ping: 1 })` belongs to `DatabaseService` and the database health indicator. An analytic repository: `analytic.md`.
- An update writes every field as given: `null-safety.md`, Update and create.
- A read that needs a parent and its children is one builder call: `include`, a nested `select`, or a relation filter on the model holding the selective predicate. No row the request already holds is read again. Where the only one-call form is a `some` or `none` filter with no other selective predicate on the driving model, the child's ids are read first, then the parent by `id: { in }` (`WorkspaceService.getListCursorByMember`). Ids a write reads for its `updateMany` are part of the write.

## Schema

Match the existing models: `id String @id @default(auto()) @map("_id") @db.ObjectId`; `createdAt createdBy` on every model; `updatedAt updatedBy` with `@updatedAt` on a model whose rows are updated, a one-time token marked on use included; `deletedAt deletedBy` on a soft-deletable model; a row only created and hard-deleted (a link, a nonce, a log or history row) carries `createdAt createdBy` alone; `@@map("<PluralPascalCase>")`; camelCase fields; relation scalars `String @db.ObjectId`; an embedded shape is a composite `type`; an enum is `Enum<Module><Concept>` with camelCase members, imported from `@generated/prisma-client/client`; every index for a query that exists, and none on a relation scalar no query filters on. The hand-back after a schema edit names the index the query needs. A persisted enum value or column rename changes the schema and every call site together.

- The file holds every `model`, then every `enum`, then every composite `type`.
- A model runs in four blocks, one blank line between them: its own fields, `id` first, relation scalars and composite `type` fields included; the audit pairs it carries, `createdAt createdBy`, `updatedAt updatedBy`, `deletedAt deletedBy`, in that order; its `@relation` fields, every singular one (optional or not) before every list; its `@@unique` lines, then its `@@index` lines, then its `@@map` (`pnpm db:format` keeps the `@@` lines together). A block the model lacks is left out with its blank line. Inside a block, and among the models, enums, and types, the existing order stays.
- A `Json` or `Json[]` field holds a free-form payload only and is named `metadata` or `data`, never `meta`; a payload with a fixed shape is plain fields or a composite `type`.

- A row the application stops reading once past its `expiredAt` is hard-deleted by its owning repository's `deleteExpiredBefore(threshold)`, never soft-deleted, scrubbed, or expired through a TTL index; its history lives in `ActivityLog`, and its model carries `@@index(fields: [expiredAt])`. `AuthSocialNonce` is swept on issue (`login.md`).
