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

- Inject `DatabaseService` (`src/common/database/services/database.service.ts`), never `PrismaClient`. It exposes `client`, the audited extended Prisma client, `withTransaction`, `beforeCommit`, and `afterCommit` (`database.md`).
- `DatabaseUtil` (`src/common/database/utils/database.util.ts`) holds the kit's pure database helpers. `src/common/database/constants/database.constant.ts` names only the Prisma error codes a contract keys on; a code literal outside that file is the defect. Services and use cases pass `string` ids; the ObjectId dialect stays in the repository.

## Queries

- A check-then-act with no unique index behind it accepts its race (`discipline.md`, Normal use). The resend gates (`verification.resendInMinutes`, `forgotPassword.resendInMinutes`) are such a check: concurrent requests both send.
- A pending-only invariant (one pending invite per workspace and email, one pending join request per workspace and user) is a required `String` column `nonce` with `@@unique`. A pending row's `nonce` holds `HelperHashService.sha256Hash` of the filled pattern, `{workspaceId}:{email}` for `WorkspaceInvite`, `{workspaceId}:{userId}` for `WorkspaceJoinRequest`; the plain pattern is never stored. At any terminal status, `nonce` holds `sha256Hash(<row id>)`, never null, so many terminal rows per pair coexist. No compound unique on `(workspaceId, email)` or `(workspaceId, userId)`. A pending row past `expiredAt` is expired in place by a guarded `updateMany`, `nonce` set to its id's digest, inside the same transaction, before an insert with that `nonce`. A collision maps to the module's duplicate exception (`WorkspaceInviteDuplicateException`, `WorkspaceJoinRequestDuplicateException`).
- The guarded statement carries the guard beside the fail-fast read, and neither replaces the other. A transition inside a transaction reads the row before the transaction opens and throws the exact exception (`WorkspaceInviteService.getResendableById`, `src/modules/workspace/services/workspace.invite.service.ts`); a lone transition (Transactions) reads the row first when its miss has two or more answers. A guarded statement's P2025 or conflict is `AppUnknownException` unless its contract names it (`repository.md`, Writes). A delete that depends on a relation reads the relation in its fail-fast read, which throws the in-use exception (`RoleService.getDeletableByActor`, `RoleUsedException`), and keeps the relation filter (`users: { none: {} }`) in `where` as its guard. A cap is counted once, before the transaction that creates the row opens. A counted cap and a relation-filter delete do not serialize against an insert on another document, because under snapshot isolation two transactions conflict only when both write one document; that race is accepted (`discipline.md`, Normal use).
- A write to one row whose data a later step reads (the response, an activity metadata, an outbox effect, the next step) is one `update()` or `delete()`, its guard in `where`, its `select` or `include` from the select map (`repository.md`, Selects); later steps read its result, never a re-read or a row rebuilt from the fail-fast read. Any other update or delete is `updateMany` / `deleteMany`, a guarded one-row one returning `count > 0` (`SessionRepository.revokeInTx`).
- A workspace has exactly one owner; ownership moves only by transfer, to another active member, by the owner or a platform admin (`WorkspaceTransferOwnershipByAdminUseCase`). Blocking or deactivating a user is never refused for the workspaces they own.
- Accepting an invite cancels that user's pending join request to the workspace, and accepting a join request revokes their pending invite, in the transaction that creates the member.

## Generated unique values

A slug, or a short human-facing reference, behind a unique index is retried up to a `*MaxAttempts` config key; a long random value (a token, a key, a verification or reset reference) is not. The insert's repository contract names the generated field (`WorkspaceSlugAlreadyExistsException`, `ProjectSlugAlreadyExistsException`, `WorkspaceInviteReferenceExistException`); the loop `continue`s on `instanceof` it and, on exhaustion, throws `AppUnknownException` carrying the last collision. A value the request supplies fails on the first collision with the feature's own exception. The use case retries; a seed retries on `DatabaseUtil.isUniqueCollision`.

## Transactions

Every transaction opens through `DatabaseService.withTransaction(fn, options?)`, Prisma's interactive `$transaction` on the audited client; an outbox row joins it (`effects.md`, Writing), and every statement inside uses `tx`. One flow, one transaction, opened by the flow's use case (`use-case.md`, Transactions). A job that pages an unbounded collection commits its bounded writes in one transaction, where it has any, then the collection a chunk at a time after that commit, each chunk idempotent, so a retry finishes it; no transaction spans the collection, and no request writes a row per member of one (`use-case.md`, Jobs). The kit opens no transaction; a seed (`seeding.md`) alone sits outside this. A method that joins a caller-owned transaction is named `*InTx` and takes `tx: IDatabaseTransactionClient`, and every other participant joins through its service's `*InTx` method, which forwards `tx` to its own repositories; one without the suffix takes no `tx` (`create` and `createInTx` are siblings). A transaction is required when an action's writes span more than one table or include an outbox row, an add with no business write included: an update outside MongoDB that a write causes (a Redis cache entry, a BullMQ job) is an outbox row (`effects.md`). An action that writes one table and no outbox row opens none, however many statements it issues: its service calls its repository on the client (`ActivityLogRepository.createMany`). Statements on one `tx`: `concurrency.md`. `options` come only from the caller's own `*TimeoutInMs` key (`user.createBulkTimeoutInMs`; a seed passes `database.seedTransactionTimeoutInMs`). Validation fails fast: every check a read answers (existence, state, permission, a flag, a value the request supplies) runs before the transaction opens and throws the failed subject's typed exception, with its own status code and message (`exception-class.md`). A write that must survive its flow's failure (a failed-attempt count, a consumed nonce) is a flow of its own: its use case commits it before the request throws, in its own transaction where the boundary asks for one. A write conflict is never retried; one no contract names, the commit's included, answers 500 (`filter.md`).

## Dates

`HelperDateService` (`src/common/helper/services/helper.date.service.ts`) owns the clock (`code-style.md`, Dates). Persisted timestamps are Prisma `DateTime`; a date on the wire is serialized by the response schema; compare `Date` objects, not strings. Durations: `config.md`. `updatedAt`, `lastActiveAt`, and a resent `expiredAt` are mutable sort keys and illegal on a cursor route (`pagination.md`).
