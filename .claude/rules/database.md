# Database — Prisma + MongoDB

Setup, seeding, and composite types are in `docs/database.md`. This file is the code rule set.

## Access

- **ALWAYS inject `DatabaseService`; never `PrismaClient` directly.** `DatabaseService` does not extend `PrismaClient`. It injects `DatabaseClientFactory` (the raw connection) plus the `DatabaseClientToken` provider (the extended client), and exposes exactly one member: `client`. That buys ONE injection point, with logging and connection lifecycle wired there once.
- **Only repositories inject `DatabaseService` for feature data access.** A service that injects it has bypassed the repository layer, and that is the single most consequential violation in this codebase (`rules/architecture.md`). Sanctioned exceptions: **migration seeds** (`rules/seeding.md`) and **health indicators** that only ping (`src/modules/health/indicators/`).
- **Model access goes through `databaseService.client`.** There is no alternative — `DatabaseService` exposes no model delegate and no `$` method. `client` is the audited extended Prisma client, produced once by `DatabaseClientFactory.create()` (`src/common/database/factories/database.client.factory.ts`). The extension itself is built by `DatabaseExtensionUtil.build()` (`src/common/database/utils/database.extension.util.ts`), which supplies the actor getter, clock, and stamper and owns the DMMF-driven stamping logic. `DatabaseClientFactory.create()` returns an INFERRED type on purpose — annotating it erases the `softDelete` and `restore` model methods, so `IDatabaseClient` reads it back with `ReturnType` and the lint exception `ts/database-inferred-client` in `eslint.config.mjs` covers it. Do not "fix" that return type. Its query hooks stamp `createdBy` / `updatedBy` from the CLS request actor on every create and update, filling a field only when the caller left it null (an explicit value wins).
- **A Prisma extended client does not expose `$on`.** `DynamicClientExtensionThisBuiltin` carries only `$extends`, `$transaction`, `$connect`, `$disconnect`, plus the model delegates and `$runCommandRaw`. Event logging is therefore registered against the raw `DatabaseClientFactory` instance, while everything else runs through `client`. That one missing member is the only reason `DatabaseService` injects the factory at all — do not "simplify" it away.
- **Stamping recurses into nested writes.** A nested `create` / `createMany` / `connectOrCreate` / `update` / `updateMany` / `upsert` reached through a relation field is stamped against the RELATED model, resolved from the Prisma DMMF. So a nested write needs no hand-written `createdBy` / `updatedBy`; keep one only where the value is deliberately not the acting user.
- **Reads are not filtered.** The extension writes audit fields; it never rewrites a `where`. Excluding soft-deleted rows stays explicit — a read against a soft-deletable model carries `deletedAt: null` itself. An auto-filter was rejected because `PaginationService` counts through `repository.count()`, which such a filter would leave unfiltered, making the page and its total disagree.
- **Soft delete and restore are `client.<model>.softDelete({ where, data? })` / `restore({ where, data? })`.** They stamp `deletedAt`, `deletedBy`, and `updatedBy`; `data` carries any co-mutated business fields and nested writes, and `data.deletedAt` overrides the timestamp when a caller needs several rows to share one. `deletedBy` comes from the CLS actor, and an explicit override must originate server-side, never from a request DTO. Hard delete (`delete` / `deleteMany`) writes no audit. `restore` is the peer API when a row must come back — prefer it over hand-clearing `deletedAt`.
- **Two cases the extension cannot serve, where a manual `deletedAt` write is correct.** `softDelete` is an `async` wrapper around a single-row `update`, so it returns a plain `Promise`, not a `PrismaPromise`, and there is no `softDeleteMany`. That rules it out when either of these holds:
  - **The delete must be atomic with other writes.** An array-form `$transaction` accepts only `PrismaPromise`s, so a `softDelete` call cannot be an element of one. A cascade that must not leave a half-deleted window belongs in the array as a plain `update` / `updateMany`.
  - **Many rows go at once.** `WorkspaceRepository.softDelete` cascading to every project in the workspace is the reference case: one `updateMany` per child model, all inside the workspace's own transaction, all sharing the parent's timestamp.

  Two obligations when you take this route. Filter to rows that are still live (`OR: <Model>ActiveFilter`) — an unfiltered `updateMany` rewrites `deletedAt` on rows deleted earlier and destroys their real deletion time. And stamp `updatedBy` by hand, since nothing else will.
- `DatabaseModule` is global through `CommonModule` (imported once at the app root; `DatabaseModule.forRoot()` is composed inside it). A feature module does not import it.
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds the Mongo `ObjectId` helpers. Use it rather than hand-rolling id validation.

## Queries

- Prisma builder only. No `$queryRaw` / `$executeRaw` in a feature repository — a raw query is invisible to the type system and to any future database switch.
- `select` shapes belong in `<module>/constants/<module>.constant.ts` as PascalCase constants, so a schema change surfaces as a compile error at one place rather than silently returning fewer fields.
- Prefer one generic repository method with a discriminator param over a near-duplicate method per variant (OCP).
- **The repository owns `null → {}` normalization** of filter params before they reach Prisma. A caller that does it has taken the repository's job.

## Generated unique values

A repository that generates a unique value itself — a slug, a reference, any random column behind a unique index — retries a bounded number of times from a `*MaxAttempts` config key, and **throws `DatabaseUniqueValueGenerationFailedException` when the attempts run out**.

- **NEVER let a raw `P2002` escape the repository as the exhaustion signal.** A caller cannot tell "we drew the same random string five times" from "the client sent a duplicate email", and the client receives an untranslated Prisma error either way.
- A `P2002` that is **not** the generated column is a different failure and is rethrown untouched — the retry loop only owns collisions on the value it drew.
- Do not fall through and let the write decide. Exhausting the attempt budget is the answer, not a step on the way to one.

This is the one exception to "a repository never throws a typed exception". It is a **`common/database`** exception, not a feature-module one, because the condition belongs to persistence rather than to any domain rule — `EnumDatabaseStatusCodeError.uniqueValueGenerationFailed` (51800), message `database.error.uniqueValueGenerationFailed`. A repository still never throws a `<feature>` exception and never builds a feature i18n path (`rules/architecture.md`).

## Transactions

MongoDB transactions require the replica set — that is why `docker-compose` runs one. Two forms:

- **Array form** for a simple sequential batch with no branching: `databaseService.client.$transaction([opA, opB])`.
- **Callback form** when the work has conditional logic, needs a read between writes, or must branch on an intermediate result: `databaseService.client.$transaction(async tx => { … })`.

Using the array form for conditional logic is the failure here — the operations are built before any of them runs, so a decision that depends on an earlier write cannot exist.

`$transaction` runs on `client` too, so the audit stamping still fires inside it. In the callback form use the `tx` client (`tx.<model>.softDelete(...)`) and never reach back to `databaseService.client` — the model methods resolve the tx-bound context, so a call on `tx` stays inside the transaction.

Transactions live in the repository. A service does not open one.

## Schema edits, and the push that is not yours

`prisma/schema.prisma` is editable and `db:generate` is yours to run; every command that opens
a connection to MongoDB belongs to the owner. What the hand-back must state, and the
conventions the schema already follows, are `rules/prisma-schema.md`.

Prisma-owned enums are imported from `@generated/prisma-client`, never re-declared in a module
(`rules/enum.md`).

## Dates

Timestamps go through `HelperService`'s date helpers, never a raw `new Date()` in business
logic (`rules/dates.md`).
