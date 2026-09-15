# Database — Prisma + MongoDB

This file is the code rule set. Flow narrative: `docs/database.md` — explorer or planner.

## Access

- **ALWAYS inject `DatabaseService`; never `PrismaClient` directly.** `DatabaseService` does not extend `PrismaClient`. It injects `DatabaseClientFactory` (the raw connection) plus the `DatabaseClientToken` provider (the extended client), and exposes `client` — the audited Prisma client. That buys ONE injection point, with logging and connection lifecycle wired there once.
- **Only repositories use `DatabaseService.client` for feature data access.** A service that issues a model query on `client` has bypassed the repository layer, and that is the single most consequential violation in this codebase (`rules/architecture.md`). A domain injects `DatabaseService` only to call `this.databaseService.withTransaction`. Sanctioned exceptions that may use `client` for model access outside a feature repository: **migration seeds** (`rules/seeding.md`) and **health indicators** that only ping (`src/modules/health/indicators/`).
- **Model access goes through `this.databaseService.client`, or through `tx` on an `*InTx` method.** There is no alternative — `DatabaseService` exposes `client` and `withTransaction`, and no model delegate. `withTransaction` is the only method that calls `client.$transaction`. `client` is the audited extended Prisma client, produced once by `DatabaseClientFactory.create()` (`src/common/database/factories/database.client.factory.ts`). The extension itself is built by `DatabaseExtensionUtil.build()` (`src/common/database/utils/database.extension.util.ts`), which supplies the actor getter, clock, and stamper and owns the DMMF-driven stamping logic. `DatabaseClientFactory.create()` returns an INFERRED type on purpose — annotating it erases the `softDelete` and `restore` model methods, so `IDatabaseClient` reads it back with `ReturnType` and the lint exception `ts/database-inferred-client` in `eslint.config.mjs` covers it. Do not "fix" that return type. Its query hooks stamp `createdBy` / `updatedBy` from the CLS request actor on every create and update, filling a field only when the caller left it null (an explicit value wins).
- **A Prisma extended client does not expose `$on`.** `DynamicClientExtensionThisBuiltin` carries only `$extends`, `$transaction`, `$connect`, `$disconnect`, plus the model delegates and `$runCommandRaw`. Event logging is therefore registered against the raw `DatabaseClientFactory` instance, while everything else runs through `client`. That one missing member is the only reason `DatabaseService` injects the factory at all — do not "simplify" it away.
- **Stamping recurses into nested writes.** A nested `create` / `createMany` / `connectOrCreate` / `update` / `updateMany` / `upsert` reached through a relation field is stamped against the RELATED model, resolved from the Prisma DMMF. So a nested write needs no hand-written `createdBy` / `updatedBy`; keep one only where the value is deliberately not the acting user.
- **Reads are not filtered.** The extension writes audit fields; it never rewrites a `where`. Excluding soft-deleted rows stays explicit — a read against a soft-deletable model carries `deletedAt: null` itself. `PaginationService` counts through `repository.count()`, so a query-hook filter would leave the count unfiltered and the page and its total would disagree.
- **Soft delete and restore are `client.<model>.softDelete({ where, data? })` / `restore({ where, data? })`.** They stamp `deletedAt`, `deletedBy`, and `updatedBy`; `data` carries any co-mutated business fields and nested writes, and `data.deletedAt` overrides the timestamp when a caller needs several rows to share one. `deletedBy` comes from the CLS actor, and an explicit override must originate server-side, never from a request DTO. Hard delete (`delete` / `deleteMany`) writes no audit. `restore` is the peer API when a row must come back — prefer it over hand-clearing `deletedAt`. A delete that must be atomic with other writes is `tx.<model>.softDelete(...)` inside `withTransaction`.
- **Many rows at once cannot use `softDelete`.** There is no `softDeleteMany`. `ProjectRepository.softDeleteByWorkspace` is the reference: one `updateMany` on the model this repository owns, filtered to rows that are still live, `updatedBy` stamped by hand. Filter to live rows (`OR: <Model>ActiveFilter`) — an unfiltered `updateMany` rewrites `deletedAt` on rows deleted earlier and destroys their real deletion time. Stamp `updatedBy` by hand, since nothing else will.
- `DatabaseModule` is global through `CommonModule` (imported once at the app root; `DatabaseModule.forRoot()` is composed inside it). A feature module does not import it.
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds the Mongo `ObjectId` helpers. Use it rather than hand-rolling id validation.
- **ID dialect is the repository's job.** Domain and HTTP pass `string` IDs. Mapping ObjectId versus UUID — and any Prisma engine type that comes with it — happens inside the repository class that `implements I*Repository`, never by leaking that type into a domain signature (`rules/architecture.md`).

## Queries

- Prisma builder only. No `$queryRaw` / `$executeRaw` in a feature repository — a raw query is invisible to the type system and to any future database switch.
- `select` shapes belong in `<module>/constants/<module>.constant.ts` as PascalCase constants, so a schema change surfaces as a compile error at one place rather than silently returning fewer fields.
- Prefer one generic repository method with a discriminator param over a near-duplicate method per variant (OCP).
- **The repository owns `null → {}` normalization** of filter params before they reach Prisma. A caller that does it has taken the repository's job.
- **`orderBy` direction is an enum, not a string literal.** Use `Prisma.SortOrder.asc` /
  `Prisma.SortOrder.desc`, or `EnumPaginationOrderDirectionType` where the call already sits
  on the pagination path (`rules/pagination.md`). `'asc'` and `'desc'` string literals in a
  Prisma `orderBy` are the defect.

## Generated unique values

A repository that generates a unique value itself — a slug, a reference, any random column behind a unique index — retries a bounded number of times from a `*MaxAttempts` config key, and **throws `DatabaseUniqueValueGenerationFailedException` when the attempts run out**.

- **NEVER let a raw `P2002` escape the repository as the exhaustion signal.** A caller cannot tell "we drew the same random string five times" from "the client sent a duplicate email", and the client receives an untranslated Prisma error either way.
- A `P2002` that is **not** the generated column is a different failure and is rethrown untouched — the retry loop only owns collisions on the value it drew.
- Do not fall through and let the write decide. Exhausting the attempt budget is the answer, not a step on the way to one.

This is the one exception to "a repository never throws a typed exception". It is a **`common/database`** exception, not a feature-module one, because the condition belongs to persistence rather than to any domain rule — `EnumDatabaseStatusCodeError.uniqueValueGenerationFailed` (51800), message `database.error.uniqueValueGenerationFailed`. A repository still never throws a `<feature>` exception and never builds a feature i18n path (`rules/architecture.md`).

## Transactions

MongoDB transactions require the replica set — that is why `docker-compose` runs one.

**Every transaction opens through `DatabaseService.withTransaction`.** That method is Prisma's interactive (callback) `$transaction`. A repository, a domain, or a seed never calls `client.$transaction` itself. Array-form `$transaction` is not used.

`withTransaction` runs on the audited `client`, so stamping still fires. Every statement inside the callback uses the `tx` client (`tx.<model>.softDelete(...)`) and never reaches back to `databaseService.client` — a call on `tx` stays inside the transaction.

**Who opens it**

- **One repository, its own model, more than one statement.** That repository calls `this.databaseService.withTransaction`. The public method takes no `tx`. The repository never issues a statement against another repository's model inside that callback, including a nested write.
- **More than one repository.** The domain calls `this.databaseService.withTransaction` and calls each collaborator as `*InTx(tx, ...)`. A repository never opens this transaction.

A repository never injects or calls another repository. Same-feature siblings are composed by the domain.

A method that runs inside that caller-owned transaction is named `*InTx` and takes `tx: IDatabaseTransactionClient` as its first parameter (`src/common/database/interfaces/database.client.interface.ts`). It issues every statement on `tx`. A method that does not join a caller-owned transaction takes no `tx` parameter and uses `this.databaseService.client`. There is no optional `tx?` and no `tx ?? this.databaseService.client` fallback. When the same write exists on both paths, the two methods are siblings — `create` and `createInTx` — not one method with an optional argument.

## Schema edits, and the push that is not yours

`prisma/schema.prisma` is editable and `db:generate` is yours to run; every command that opens
a connection to MongoDB belongs to the owner. What the hand-back must state, and the
conventions the schema already follows, are `rules/prisma-schema.md`.

Prisma-owned enums are imported from `@generated/prisma-client`, never re-declared in a module
(`rules/enum.md`).

## Dates

Timestamps go through `HelperDateService`, never a raw `new Date()` in business
logic (`rules/dates.md`).
