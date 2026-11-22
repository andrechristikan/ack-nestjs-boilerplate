---
paths:
    - '**/repositories/**'
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'src/common/database/**'
    - 'prisma/**'
---

# Transactions and database access

Statements, audit stamping, and the schema: `repository.md`. The kit: `database.md`.

## Access

- Inject `DatabaseService` (`src/common/database/services/database.service.ts`), never `PrismaClient`. It exposes `client`, the audited extended Prisma client, `withTransaction`, and `afterCommit` (`database.md`).
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds the kit's pure database helpers. Prisma error codes are named constants in `src/common/database/constants/database.constant.ts`; a code literal outside that file is the defect. Services and use cases pass `string` ids; the ObjectId dialect stays in the repository.

## Queries

- A check-then-act with no unique index behind it accepts its race (`discipline.md`, Normal use). The resend gates (`verification.resendInMinutes`, `forgotPassword.resendInMinutes`) are such a check: concurrent requests both send.
- A pending-only invariant (one pending invite per workspace and email, one pending join request per workspace and user) is a required `String` column `nonce` with `@@unique`. A pending row's `nonce` holds `HelperHashService.sha256Hash` of the filled pattern, `{workspaceId}:{email}` for `WorkspaceInvite`, `{workspaceId}:{userId}` for `WorkspaceJoinRequest`; the plain pattern is never stored. At any terminal status, `nonce` holds `sha256Hash(<row id>)`, never null, so many terminal rows per pair coexist. No compound unique on `(workspaceId, email)` or `(workspaceId, userId)`. A pending row past `expiredAt` is expired in place by a guarded `updateMany`, `nonce` set to its id's digest, inside the same transaction, before an insert with that `nonce`. A collision maps to the module's duplicate exception (`WorkspaceInviteDuplicateException`, `WorkspaceJoinRequestDuplicateException`).
- The guarded statement carries the guard, and a read never replaces it. A transition inside a transaction reads the row before the transaction opens and throws the exact exception (`WorkspaceInviteService.getResendableById`, `src/modules/workspace/services/workspace.invite.service.ts`); a miss after that read throws the guard's own exception. A lone transition (Transactions) reads the row first when its miss has two or more answers, then maps `count === 0` to the guard's own exception. A delete that depends on a relation is one `deleteMany` with a relation filter (`where: { id, users: { none: {} } }`), `count === 0` mapping to the in-use exception (`RoleUsedException`). A cap is counted once, before the transaction that creates the row opens. A counted cap and a relation-filter `deleteMany` do not serialise against an insert on another document, because under snapshot isolation two transactions conflict only when both write one document; that race is accepted (`discipline.md`, Normal use).
- A workspace has exactly one owner; ownership moves only by transfer, to another active member, by the owner or a platform admin (`WorkspaceTransferOwnershipByAdminUseCase`). Blocking or deactivating a user is never refused for the workspaces they own.
- Accepting an invite cancels that user's pending join request to the workspace, and accepting a join request revokes their pending invite, in the transaction that creates the member.

## Generated unique values

A slug, or a short human-facing reference, behind a unique index is retried up to a `*MaxAttempts` config key; a long random value (a token, a key, a verification or reset reference) is not. The retried one throws `DatabaseUniqueValueGenerationFailedException` (`51800`) on exhaustion; a raw `DatabaseUniqueConstraintCode` collision never escapes as the exhaustion signal, and one on another column goes through the feature's own util mapper (`exceptions.md`) or is wrapped in `AppUnknownException`. A value the request supplies fails on the first collision with the feature's own exception. The retry sits with the use case, or with the method issuing a lone insert.

## Transactions

Every transaction opens through `DatabaseService.withTransaction(fn, options?)`, Prisma's interactive `$transaction` on the audited client; an outbox row joins it (`effects.md`, Writing), and every statement inside uses `tx`. One flow, one transaction, opened by the flow's use case (`use-case.md`, Transactions). A job that pages an unbounded collection commits its bounded writes in one transaction, where it has any, then the collection a chunk at a time after that commit, each chunk idempotent, so a retry finishes it; no transaction spans the collection, and no request writes a row per member of one (`use-case.md`, Jobs). The kit opens no transaction; a seed (`seeding.md`) alone sits outside this. A method that joins a caller-owned transaction is named `*InTx` and takes `tx: IDatabaseTransactionClient`, and every other participant joins through its service's `*InTx` method, which forwards `tx` to its own repositories; one without the suffix takes no `tx` (`create` and `createInTx` are siblings). A transaction is required when an action's writes span more than one table or include an outbox row, an add with no business write included: an update outside MongoDB that a write causes (a Redis cache entry, a BullMQ job) is an outbox row (`effects.md`). An action that writes one table and no outbox row opens none, however many statements it issues: its service calls its repository on the client (`ActivityLogRepository.createMany`). Statements on one `tx`: `concurrency.md`. A guarded state transition is one `updateMany` whose `where` carries the expected state, returning `count > 0` (`SessionRepository.revokeInTx`). `options` come only from the caller's own `*TimeoutInMs` key (`user.create.bulkTimeoutInMs`; a seed passes `database.seedTransactionTimeoutInMs`). Validation fails fast: every check a read answers (existence, state, permission, a flag, a value the request supplies) runs before the transaction opens and throws the failed subject's typed exception, with its own status code and message (`exception-class.md`); inside, the statement still carries its guard. A write that must survive its flow's failure (a failed-attempt count, a consumed nonce) is a flow of its own: its use case commits it before the request throws, in its own transaction where the boundary asks for one. A write conflict (`DatabaseWriteConflictCode`) is never retried. The use case that opened a transaction wrapping a guarded transition maps its write conflict to the guard's own exception, so the loser answers the guard's 4xx, never 409 (term-policy publish: 400 `statusInvalid`).

## Dates

`HelperDateService` (`src/common/helper/services/helper.date.service.ts`) owns the clock. Persisted timestamps are Prisma `DateTime`; a date on the wire is serialized by the response schema; compare `Date` objects, not strings. Durations: `config.md`. `updatedAt`, `lastActiveAt`, and a resent `expiredAt` are mutable sort keys and illegal on a cursor route (`pagination.md`).
