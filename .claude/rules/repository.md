---
paths:
    - '**/repositories/**'
    - 'prisma/**'
    - 'src/common/database/**'
    - '**/constants/**'
---

# Repositories and schema

Who opens a transaction, guarded statements, and retries: `transaction.md`.

## Writes

- The extension stamps `createdBy` / `updatedBy` from the CLS actor (`RequestActorStoreKey`, set by the JWT guards on HTTP only) on `create`, `createMany`, `update`, `updateMany`, `upsert`, filling a field of the top-level payload only when the caller left it null. A nested write is not stamped: it passes its audit values explicitly. A processor, a seed, and a public route have no actor: a row that names a user passes it explicitly; a system row (a nonce, a snapshot, an outbox row) leaves `createdBy` unset. An explicit `createdBy` is the admin on an admin path, the job it queues included, and the user themself on sign-up and social sign-in.
- Prisma on MongoDB matches `field: null` only where `null` is stored, so every create writes `null` into each nullable column a read filters by `null`. A soft-deletable model's live-row read filters `deletedAt: null`.
- A soft delete with no guard is `client.<model>.softDelete({ where, data? })`, a guarded one a live-row `update()` or `updateMany` (`transaction.md`, Queries) with `deletedAt` and `deletedBy` in `data`; restore is `restore(...)`. The two extension methods are typed only on a model with `deletedAt`: `where`, `data`, and the result are that model's `update` types. Both stamp the audit fields. Hard `delete` writes no audit. Soft-deleting a `Workspace` or `Project` rewrites its slug to `deleted-<id>`, one statement per row; another many-row delete is one live-row `updateMany` with `deletedAt` and `deletedBy` in `data`.
- A write whose failure has an answer wraps its statement in `try`/`catch` and throws `toWriteException(error, miss)` or `toUniqueException(error, collisions, miss)`, the exception built inline: `throw this.databaseUtil.toWriteException(error, new SessionNotFoundException())`. An `update()` or `delete()` passes its row's guard or not-found exception as `miss`, never a unique field's already-exists one. An insert raises no P2025, so its `miss` answers a write conflict only: its own duplicate exception where the flow types a conflict, else `new AppUnknownException(error)`. A guarded one-row `updateMany` or `deleteMany` catches with `toWriteException`, its guard's exception as `miss`, and keeps its count answer (`SessionRepository.revokeInTx`). A bulk or unguarded write keeps no catch.

## Queries

- A flow is measured by its Prisma calls; an `include` or a nested `select` is part of its call. A result is fetched by one statement, never by a first query whose rows drive a second: ids then details, a query per row, a little data first and an aggregate after. A parent and its children are one builder call: `include`, a nested `select`, or a relation filter on the model holding the selective predicate. A read over several parents is one statement by `{ in }` (`workspaceId: { in }`), in a job as in a request.
- A repository outside `src/modules/analytic/` uses the Prisma builder; where no single builder call fetches the result, it runs one `aggregateRaw` pipeline, as an analytic repository does (`analytic.md`, One statement): a list cuts its page inside the pipeline, and `<Module><Computation>PipelineSchema` (`dtos/<module>.<computation>-pipeline.dto.ts`) parses the result into its `I*` shape, a parse failure throwing `AppUnknownException`. No `findRaw`, `$queryRaw`, or `$executeRaw`. `$runCommandRaw({ ping: 1 })` belongs to `DatabaseService` and the database health indicator.
- Reads of different subjects stay separate statements, concurrent where independent (`concurrency.md`). A write issues the statements its flow needs; a read that checks its row first, and ids it reads for its `updateMany`, are part of the write. A bulk `createMany` or `updateMany` returns a count; a later step that needs its rows re-reads them.
- A row a guard loaded is never read again: `guards.md`, Contexts.
- An update writes every field as given: `null-safety.md`, Update and create.

## Selects

- A model's select map holds its full row (no `select`), at most one `<Model>RefSelect` for internal reads (ids, foreign keys, a few small scalars, never a hash or a secret), and its default response shapes. Every response of the model reads a default shape: a field one response needs joins the default or leaves that response. A list and a detail keep two shapes only where their data differs.
- A read that returns a primitive or an id list takes its field from the model's `RefSelect`.
- Every select and include is a constant in `<module>.constant.ts`, `satisfies Prisma.<Model>Select` or `Include`; an include whose `where` takes an argument is a private builder method of its repository, its fields from the constants. A repository writes no select or include object inline.
- The `User` relation shapes are `UserRefSelect` (a response's user), `UserRecipientSelect` (an address to send to), and `UserStateSelect` (a status check). `<Prefix>` is the module-prefixed model name: `<Prefix>WithUserInclude` carries `user` through `UserRefSelect`; an internal read's `User` include is `<Prefix>WithUser<Shape>Include`, `<Shape>` `State` or `Recipient` (`WorkspaceMemberWithUserStateInclude`, `UserForgotPasswordWithUserRecipientInclude`).

## Schema

Match the existing models: `id String @id @default(auto()) @map("_id") @db.ObjectId`; `createdAt createdBy` on every model; `updatedAt updatedBy` with `@updatedAt` on a model whose rows are updated, a one-time token marked on use included; `deletedAt deletedBy` on a soft-deletable model; a row only created and hard-deleted (a link, a nonce, a log or history row) carries `createdAt createdBy` alone; `@@map("<PluralPascalCase>")`; camelCase fields; relation scalars `String @db.ObjectId`, and every `@db.ObjectId` field but `id` and the audit `createdBy`, `updatedBy`, `deletedBy` is one, carrying its `@relation`; an embedded shape is a composite `type`; an enum is `Enum<Module><Concept>` with camelCase members, imported from `@generated/prisma-client/client`; every index for a query that exists, and none on a relation scalar no query filters on. The hand-back after a schema edit names the index the query needs. A persisted enum value or column rename changes the schema and every call site together.

- The file holds every `model`, then every `enum`, then every composite `type`.
- A model runs in four blocks, one blank line between them: its own fields, `id` first, relation scalars and composite `type` fields included; the audit pairs it carries, `createdAt createdBy`, `updatedAt updatedBy`, `deletedAt deletedBy`, in that order; its `@relation` fields, every singular one (optional or not) before every list; its `@@unique` lines, then its `@@index` lines, then its `@@map` (`pnpm db:format` keeps the `@@` lines together). A block the model lacks is left out with its blank line. Inside a block, and among the models, enums, and types, the existing order stays.
- A generated value that references no row (a batch id, a claim nonce) is a plain `String` with no `@db.ObjectId`, and no model is added only to give it a relation.
- A `Json` or `Json[]` field holds a free-form payload only and is named `metadata` or `data`, never `meta`; a payload with a fixed shape is plain fields or a composite `type`.

- A row the application stops reading once past its `expiredAt` is hard-deleted by its owning repository's `deleteExpiredBefore(threshold)`, never soft-deleted, scrubbed, or expired through a TTL index; its history lives in `ActivityLog`, and its model carries `@@index(fields: [expiredAt])`. `AuthSocialNonce` is swept on issue (`login.md`).
