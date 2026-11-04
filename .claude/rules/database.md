---
paths:
    - '**/repositories/**'
    - 'src/modules/*/domains/**'
    - 'src/modules/*/services/**'
    - 'prisma/**'
    - 'src/common/database/**'
---

# Database

## Access

- Inject `DatabaseService` (`src/common/database/services/database.service.ts`), never `PrismaClient`. It exposes `client`, the audited extended Prisma client, and `withTransaction` (`:151`). Only a repository issues a model query on `client`, seeds (`seeding.md`) and health indicators excepted.
- `client` is built once by `DatabaseClientFactory.create()` with the extension from `DatabaseExtensionFactory.build()` (`src/common/database/factories/database.extension.factory.ts`). `create()` returns `IDatabaseClient` with `softDelete` and `restore`, `build()` returns `IDatabaseExtension`, both in `src/common/database/interfaces/database.client.interface.ts`. `DatabaseService` injects the raw factory only because an extended client has no `$on`.
- The extension stamps `createdBy` / `updatedBy` from the CLS actor (`RequestActorStoreKey`, set by `RequestActorInterceptor` on HTTP requests only) on `create`, `createMany`, `update`, `updateMany`, `upsert`, filling a field only when the caller left it null. Nested writes are stamped against the related model through `DatabaseModelRelations` (`src/common/database/constants/database.constant.ts`), typed against `Prisma.TypeMap`, so a new relation fails `pnpm typecheck` until listed. A processor, a seed, and a public route have no actor and pass audit values explicitly.
- A read against a soft-deletable model filters itself to live rows with `OR: <Model>ActiveFilter` (`src/modules/project/constants/project.constant.ts:103`), which also matches a document where `deletedAt` was never written; a model with no such constant (`User`) filters `deletedAt: null`.
- Soft delete is `client.<model>.softDelete({ where, data? })`, restore is `restore(...)`; both stamp the audit fields. Hard `delete` writes no audit. Many rows is one `updateMany` filtered to live rows with `deletedAt` and `deletedBy` in `data` (`src/modules/project/repositories/project.repository.ts:167`).
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds `checkIdIsValid`, `createId`, `isUniqueCollision`, `toException`, `toPlainObject`, and `toPlainArray`. Prisma error codes are named constants in `src/common/database/constants/database.constant.ts` (`DatabaseUniqueConstraintCode`, `DatabaseWriteConflictCode`, `DatabaseUnavailableCodes`); a code literal outside that file is the defect. Domain and HTTP pass `string` ids; the ObjectId dialect stays in the repository.
- `toException`, the `AppGeneralFilter` mapping (`exceptions.md`), maps `DatabaseWriteConflictCode` to `DatabaseWriteConflictException` (409); a `DatabaseUnavailableCodes` member or a `PrismaClientInitializationError` to `DatabaseUnavailableException` (503); P2023, inconsistent column data such as a malformed ObjectId, to its own 400 `database` exception; P2028, a transaction API failure, to its own 503 `database` exception.

## Queries

- Prisma builder only; no `$queryRaw` / `$executeRaw` in a feature repository.
- An update writes every field as given: `null-safety.md`, Update and create.
- A check-then-act is a race unless a unique index enforces it; where no index backs the invariant, say so. The resend gates (`verification.resendInMs`, `forgotPassword.resendInMs`) have no such index: concurrent requests both send.
- A pending-only invariant (one pending invite per workspace and email, one pending join request per workspace and user) is a required `String` column `nonce` with `@@unique`. A pending row's `nonce` holds `HelperHashService.sha256Hash` of the filled pattern, `{workspaceId}:{email}` for `WorkspaceInvite`, `{workspaceId}:{userId}` for `WorkspaceJoinRequest`; the plain pattern is never stored. At any terminal status, `nonce` holds `sha256Hash(<row id>)`, never null, so many terminal rows per pair coexist. No compound unique on `(workspaceId, email)` or `(workspaceId, userId)`: many rows per pair are valid. A pending row past `expiredAt` is expired in place by a guarded `updateMany`, `nonce` set to its id's digest, inside the same transaction, before an insert with that `nonce`. A collision maps to the module's duplicate exception (`WorkspaceInviteDuplicateException`, `WorkspaceJoinRequestDuplicateException`).
- The guarded statement carries the guard, and a read never replaces it. A transition whose miss has two or more answers reads the row first and throws the exact exception (`WorkspaceInviteDomain.getResendableById`, `src/modules/workspace/domains/workspace.invite.domain.ts:250`); a miss after that read throws the guard's own exception. A transition with one answer runs the statement alone and maps `count === 0` to that answer. A delete that depends on a relation is one `deleteMany` with a relation filter (`where: { id, users: { none: {} } }`), `count === 0` mapping to the in-use exception (`RoleUsedException`). A cap is counted inside the transaction that creates the row.

## Generated unique values

A slug, reference, or random column behind a unique index is retried up to a `*MaxAttempts` config key and throws `DatabaseUniqueValueGenerationFailedException` (`51800`) on exhaustion; a raw `DatabaseUniqueConstraintCode` collision never escapes as the exhaustion signal, and one on another column goes through the feature's own util mapper (`exceptions.md`) or is wrapped in `AppUnknownException`. A value the request supplies fails on the first collision with the feature's own exception. The retry sits with whoever owns the transaction.

## Transactions

Every transaction opens through `DatabaseService.withTransaction(fn, options?)`, Prisma's interactive `$transaction` on the audited client; every statement inside uses `tx`. Who opens it (`cross-module.md`): the repository when every statement is on models it owns; the domain across its own module's repositories; the HTTP or processor service across modules, one per flow (`service.md`). A method that joins a caller-owned transaction is named `*InTx` with `tx: IDatabaseTransactionClient` first; one without the suffix takes no `tx` (`create` and `createInTx` are siblings). A single statement, `updateMany` and `createMany` included, opens no transaction. Statements on one `tx` run sequentially (`for...of`), never in a `Promise.all`. A guarded state transition is one `updateMany` whose `where` carries the expected state, returning `count > 0` (`src/modules/session/repositories/session.repository.ts:171`). `options` come only from the caller's own `*TimeoutInMs` key (`user.create.bulkTimeoutInMs`; a seed passes `database.seedTransactionTimeoutInMs`). A write conflict (`DatabaseWriteConflictCode`) is not retried. Whoever opened a multi-statement transaction holding a guarded transition maps its write conflict to the guard's own exception, so the loser answers the guard's 4xx, never 409 (term-policy publish: 400 `statusInvalid`).

## Dates

`HelperDateService` (`src/common/helper/services/helper.date.service.ts`) owns the clock. Persisted timestamps are Prisma `DateTime`; a date on the wire is serialized by the response schema; compare `Date` objects, not strings. Durations: `config.md`. `updatedAt`, `lastActiveAt`, and a resent `expiredAt` are mutable sort keys and illegal on a cursor route (`pagination.md`).

## Schema

Applying `prisma/schema.prisma`: `AGENTS.md`. Match the existing models: `id String @id @default(auto()) @map("_id") @db.ObjectId`; `createdAt createdBy updatedAt updatedBy` with `@updatedAt`, plus `deletedAt deletedBy` on a soft-deletable model, and `createdAt createdBy` alone on an activity-log, history, acceptance, or one-time-token row; `@@map("<PluralPascalCase>")`; camelCase fields; relation scalars `String @db.ObjectId`; an embedded shape is a composite `type`; an enum is `Enum<Module><Concept>` with camelCase members, imported from `@generated/prisma-client/client`; every index for a query that exists. The hand-back after a schema edit names the index the query needs. A persisted enum value or column rename changes the schema and every call site together.
