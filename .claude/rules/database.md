# Database — Prisma + MongoDB

Setup, seeding, and composite types are in `docs/database.md`. This file is the code rule set.

## Access

- **ALWAYS inject `DatabaseService`; never `PrismaClient` directly.** `DatabaseService` does not extend `PrismaClient`. It injects `DatabaseClientFactory` (the raw connection) plus the `DatabaseClientToken` provider (the extended client), and exposes exactly one member: `client`. That buys ONE injection point, with logging and connection lifecycle wired there once.
- **Only repositories inject `DatabaseService` for feature data access.** A service that injects it has bypassed the repository layer, and that is the single most consequential violation in this codebase (`rules/architecture.md`). Sanctioned exceptions: **migration seeds** (`rules/migration.md`) and **health indicators** that only ping (`src/modules/health/indicators/`).
- **Model access goes through `databaseService.client`.** There is no alternative — `DatabaseService` exposes no model delegate and no `$` method. `client` is the audited extended Prisma client, produced once by `DatabaseClientFactory.create()` (`src/common/database/factories/database.client.factory.ts`). The extension itself is `buildDatabaseExtension` in `src/common/database/constants/database.function.constant.ts`; `DatabaseExtensionUtil` (`src/common/database/utils/database.extension.util.ts`) supplies its actor getter, clock, and stamper, and owns the DMMF-driven stamping logic. Its query hooks stamp `createdBy` / `updatedBy` from the CLS request actor on every create and update, filling a field only when the caller left it null (an explicit value wins).
- **A Prisma extended client does not expose `$on`.** `DynamicClientExtensionThisBuiltin` carries only `$extends`, `$transaction`, `$connect`, `$disconnect`, plus the model delegates and `$runCommandRaw`. Event logging is therefore registered against the raw `DatabaseClientFactory` instance, while everything else runs through `client`. That one missing member is the only reason `DatabaseService` injects the factory at all — do not "simplify" it away.
- **Stamping recurses into nested writes.** A nested `create` / `createMany` / `connectOrCreate` / `update` / `updateMany` / `upsert` reached through a relation field is stamped against the RELATED model, resolved from the Prisma DMMF. So a nested write needs no hand-written `createdBy` / `updatedBy`; keep one only where the value is deliberately not the acting user.
- **Reads are not filtered.** The extension writes audit fields; it never rewrites a `where`. Excluding soft-deleted rows stays explicit — a read against a soft-deletable model carries `deletedAt: null` itself. An auto-filter was rejected because `PaginationService` counts through `repository.count()`, which such a filter would leave unfiltered, making the page and its total disagree.
- **Soft delete and restore are `client.<model>.softDelete({ where, data? })` / `restore({ where, data? })`, never a manual `deletedAt` update.** They stamp `deletedAt`, `deletedBy`, and `updatedBy`; `data` carries any co-mutated business fields and nested writes. `deletedBy` comes from the CLS actor, and an explicit override must originate server-side, never from a request DTO. Hard delete (`delete` / `deleteMany`) writes no audit. Soft-delete call sites are common; `restore` is the peer API when a row must come back — prefer it over hand-clearing `deletedAt`.
- `DatabaseModule` is global through `CommonModule` (imported once at the app root; `DatabaseModule.forRoot()` is composed inside it). A feature module does not import it.
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds the Mongo `ObjectId` helpers. Use it rather than hand-rolling id validation.

## Queries

- Prisma builder only. No `$queryRaw` / `$executeRaw` in a feature repository — a raw query is invisible to the type system and to any future database switch.
- `select` shapes belong in `<module>/constants/<module>.constant.ts` as PascalCase constants, so a schema change surfaces as a compile error at one place rather than silently returning fewer fields.
- Prefer one generic repository method with a discriminator param over a near-duplicate method per variant (OCP).
- **The repository owns `null → {}` normalization** of filter params before they reach Prisma. A caller that does it has taken the repository's job.

## Transactions

MongoDB transactions require the replica set — that is why `docker-compose` runs one. Two forms:

- **Array form** for a simple sequential batch with no branching: `databaseService.client.$transaction([opA, opB])`.
- **Callback form** when the work has conditional logic, needs a read between writes, or must branch on an intermediate result: `databaseService.client.$transaction(async tx => { … })`.

Using the array form for conditional logic is the failure here — the operations are built before any of them runs, so a decision that depends on an earlier write cannot exist.

`$transaction` runs on `client` too, so the audit stamping still fires inside it. In the callback form use the `tx` client (`tx.<model>.softDelete(...)`) and never reach back to `databaseService.client` — the model methods resolve the tx-bound context, so a call on `tx` stays inside the transaction.

Transactions live in the repository. A service does not open one.

## Schema is off-limits

- **Do NOT edit `prisma/schema.prisma`.** Describe the change; the owner applies it.
- **Do NOT run schema or DB commands** — `db:migrate`, `db:push`, `db:generate`, `migration:*`. Even `db:generate` regenerates a client the owner may not want regenerated mid-task.
- Prisma-owned enums are imported from `@generated/prisma-client` (aliased as `@prisma/client`). A module-local re-declaration of a schema-owned enum is a second source of truth with a pointless mapper between two identical enums.
- Renaming a persisted enum value is a data migration, not a rename. Describe it.

## Dates

Use `HelperService`'s date helpers rather than raw `new Date()` in business logic. They normalize consistently and give one mockable clock; a scattered `new Date()` is untestable and timezone-fragile. `TZ=UTC` in the test script exists because of this.
