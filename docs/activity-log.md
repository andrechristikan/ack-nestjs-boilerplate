# Activity Log Documentation

Activity Log lives in `src/modules/activity-log`.

## Overview

Activity Log records audited user actions:

- During the request, a domain builds each event with `ActivityLogDomain.prepare` and queues it with `ActivityLogDomain.stagePrepared`.
- The always-on `ActivityLogInterceptor` (registered from `ActivityLogDomainModule`) flushes after the handler settles: success flushes every staged event; an error path flushes only events prepared with `onError: true`.
- Flushed rows go through `ActivityLogRepository.createMany`, which opens `DatabaseService.withTransaction` itself.
- An action one user takes on another user writes two rows: one owned by the actor and one owned by the affected user. See [Actor and target rows](#actor-and-target-rows).

**Failed credential logins**

Both paths answer an error; `onError: true` is what writes the rows. All three contracts in `ActivityLogActionContract` are `user = target`, `workspace = none`, metadata `ActivityLogEmptyMetadataSchema`. Login path: [Authentication](authentication.md). Analytic failed-login and lockout metrics count these rows: [Analytic](analytic.md).

- **Password mismatch.** `UserAuthDomain` calls `UserLoginDomain.recordLoginFailed`, which prepares `EnumActivityLogAction.userLoginFailed` with `onError: true` and with `userId` and `createdBy` set to the target user, increments the password-attempt counter, then stages the event. i18n: `activityLog.userLoginFailed` ("Login failed with invalid credentials").
- **Attempt limit already reached.** `UserAuthDomain` calls `UserPasswordDomain.reachMaxPasswordAttempt` instead. It prepares `userRevokeAllSessions` and `userReachMaxPasswordAttempt` the same way, runs the lockout transaction (user `inactive`, sessions and device ownerships revoked), purges the user's session keys, then stages `userRevokeAllSessions` followed by `userReachMaxPasswordAttempt`. i18n: `activityLog.userReachMaxPasswordAttempt` ("Maximum password attempts has been reached").

**Notes:**

- Flush failures are logged and do not change the handler outcome.
- Metadata carries no secrets (password, token, API key) and no large objects; each action's metadata schema in `ActivityLogActionContract` declares what it holds. Metadata is returned to the client through a typed response schema.

## Related Documents

- [Authentication Documentation][ref-doc-authentication] - User context (`request.user`)
- [Authorization Documentation][ref-doc-authorization] - Guards and policy abilities
- [Response Documentation][ref-doc-response] - List response serialization
- [Language Message Documentation][ref-doc-message] - i18n description source
- [Pagination Documentation][ref-doc-pagination] - List endpoints
- [Analytic Documentation][ref-doc-analytic] - Metrics that count activity-log actions

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Architecture](#architecture)
- [List Endpoints](#list-endpoints)
- [Flow](#flow)
- [Staging an activity](#staging-an-activity)
- [Actor and target rows](#actor-and-target-rows)
- [Data](#data)

## Architecture

| Component | Responsibility |
|---|---|
| `ActivityLogDomain.prepare` | Validates contract and metadata, returns an `IActivityLogStagedEvent`; stages nothing |
| `ActivityLogDomain.stagePrepared` | Pushes prepared events onto the request-store stage list |
| `ActivityLogInterceptor` | After the handler settles, calls `ActivityLogDomain.flushStaged` (all staged on success; `onError: true` only on error) |
| `RequestStoreService` | Per-request carrier for staged events (`ActivityLogStageStoreKey`), request log, and workspace |
| `ActivityLogDomain.flushStaged` | Builds rows and writes them via `ActivityLogRepository.createMany` |
| `ActivityLogHttpService` | Transport layer for the four list routes; the page it returns is serialized against `ActivityLogResponseSchema` declared on the route |
| `ActivityLogRepository` | Data access (Prisma), including `createMany`, which runs the insert in its own transaction |
| `ActivityLogUtil` | Builds the i18n description (`getDescription`) |
| `ActivityLogActionContract` | Per-action contract: how `userId` and `workspaceId` resolve, and the metadata schema |
| `ActivityLogWorkspaceVolumeContract` | Target-side workspace and project actions left out of workspace volume metrics |

## List Endpoints

| Method | Path | Scope |
|--------|------|-------|
| `GET` | `/shared/user/activity-log/list` | Authenticated user lists own logs (cursor) |
| `GET` | `/shared/user/activity-log/workspace/list` | Authenticated user lists own logs in the workspace from `x-workspace-id` (cursor) |
| `GET` | `/admin/activity-log/user/:userId/list` | Admin lists a user's logs (offset) |
| `GET` | `/admin/activity-log/workspace/:workspaceId/list` | Admin lists a workspace's logs, optionally narrowed by a `userId` query param (offset) |

Global prefix `/api` and version `v1` apply as elsewhere.

List scope:

- **User-scoped lists** return every row whose `userId` is that user, with or without a workspace: the actions the user performed and the target rows written when someone else acted on the user.
- **Workspace-scoped lists** return the rows of one workspace. The shared one is narrowed to the caller's rows; the admin one is narrowed only when `userId` is passed, so a paired workspace action appears there twice, once for each party.

## Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Domain
    participant Storage as RequestStoreService
    participant Interceptor as ActivityLogInterceptor
    participant Repo as ActivityLogRepository

    Client->>Controller: HTTP Request
    Controller->>Domain: business logic
    Note over Domain: prepare({ action, userId?, createdBy?, workspaceId?, metadata?, onError? })<br/>validates before the audited write
    Domain->>Domain: audited write
    Domain->>Storage: stagePrepared(events)
    alt Success
        Domain-->>Interceptor: result
        Interceptor->>Domain: flushStaged({ isError: false })
        Domain->>Repo: createMany(rows)
        Repo-->>Client: Success Response
    else Failure
        Domain-->>Interceptor: throws
        Interceptor->>Domain: flushStaged({ isError: true })
        Note over Domain: Only events with onError true
        Domain->>Repo: createMany(rows) when any qualify
        Repo-->>Client: Error Response
    end
```

## Staging an activity

Every caller follows one order:

1. Prepare and validate every event (`prepare` checks metadata against `ActivityLogActionContract[action].metadata` and the user and workspace fields).
2. Write (a contract failure throws before anything commits; a failed write stages nothing).
3. Stage the prepared events.

A session or device path commits, then writes or purges the session cache, then stages. An id the metadata needs before the row exists is drawn first with `DatabaseUtil.createId()`, and a metadata `timestamp` is the domain's pre-write time. Example from `RoleDomain.createByAdmin`, whose private `prepareActivityLog` wraps `ActivityLogDomain.prepare`:

```typescript
const roleId = this.databaseUtil.createId();
const events = [
    this.prepareActivityLog(
        EnumActivityLogAction.adminRoleCreate,
        { id: roleId, name: data.name, type: data.type },
        this.helperDateService.create()
    ),
];
const created = await this.roleRepository.create(roleId, data);

this.activityLogDomain.stagePrepared(events);
```

`userLoginFailed` is prepared with an explicit target `userId`, the same user as `createdBy`, empty metadata, and `onError: true`:

```typescript
const events = [
    this.activityLogDomain.prepare({
        action: EnumActivityLogAction.userLoginFailed,
        userId,
        createdBy: userId,
        onError: true,
    }),
];
await this.userRepository.increasePasswordAttempt(userId);

this.activityLogDomain.stagePrepared(events);
```

Events prepared inside a transaction callback, after a write whose returned row the metadata needs, are returned from the callback and staged after the commit. `SessionDomain.revokeAllByAdmin` prepares its pair after the commit, because `sessionCount` exists only once the revoke has run.

`onError: true` is set on:

- `userLoginFailed`
- `userReachMaxPasswordAttempt` and `userRevokeAllSessions` on the lockout path
- the five API key admin writes (status, name, dates, reset, delete)

An API key admin write stages its row after the database write and before the cache delete, so a cache delete that fails and answers 500 still records the change. Every other event is success-only.

The contract's `user` value decides which user fields `prepare` accepts:

| `user` | Row owner (`userId`) | `createdBy` | What `prepare` carries |
|---|---|---|---|
| `payload` | The JWT user (`request.user.userId`), read by `ActivityLogInterceptor` and resolved at flush | The row owner | Neither `userId` nor `createdBy` |
| `target` | The `userId` passed to `prepare` | The `createdBy` passed to `prepare`: the acting user, or the row's own user on a self or public path | Both `userId` and `createdBy` |

A missing required field, or a user field passed to a `payload` action, throws `ActivityLogContractInvalidException`. The contract's `workspace` value works the same way: `payload` reads the current workspace from the request store, `target` takes the staged `workspaceId`, and `none` stores `null`.

Request context (IP, user agent, geo) is read at flush from `RequestLogStoreKey`, filled once per request by `RequestRequestLogMiddleware`. See [Security and Middleware][ref-doc-security-and-middleware].

## Actor and target rows

When one user acts on another user, the domain prepares two rows:

- **Actor row.** Uses the action the actor performed and belongs to the actor.
- **Target row.** Uses the paired `…ByAdmin`, `…ByOwner`, or `…ByInvitee` action (or `userBlocked` / `userUpdateStatus` for a status change), has contract `user = target`, and belongs to the affected user, with `createdBy` set to the actor.

When the actor and the affected user are the same person, the domain prepares the actor row only; each call site makes that comparison itself.

```mermaid
flowchart TD
    A[Domain handles a mutation on another user] --> B["prepare actor row<br/>plain action, metadata.targetUserId"]
    B --> C{"affected user<br/>= actor?"}
    C -->|yes| E[Actor row only]
    C -->|no| D["prepare target row<br/>paired action, userId = affected user,<br/>createdBy = actor, metadata.actorUserId"]
    D --> G[write, then stagePrepared]
    E --> G
    G --> F[ActivityLogInterceptor flushes every staged row in one transaction]
```

| Actor action (row of the actor) | Target action (row of the affected user) | Affected user |
|---|---|---|
| `adminUserCreate` | `userCreatedByAdmin` | The new user |
| `adminUserImport` | `userCreatedByAdmin`, one row per imported user | Each new user |
| `adminUserUpdateStatus` | `userBlocked` (status `blocked`), `userUpdateStatus` (any other status) | The updated user |
| `adminUserUpdatePassword` | `userUpdatePasswordByAdmin` | The updated user |
| `adminUserResetTwoFactor` | `userResetTwoFactorByAdmin` | The updated user |
| `adminSessionRevoke` | `userRevokeSessionByAdmin` | The session owner |
| `adminSessionRevokeAll` | `userRevokeAllSessionsByAdmin` | The session owner |
| `adminDeviceRemove` | `userRemoveDeviceByAdmin` | The device owner |
| `workspaceMemberRoleUpdated` | `workspaceMemberRoleUpdatedByAdmin` | The target member |
| `workspaceMemberRemoved` | `workspaceMemberRemovedByAdmin` | The removed member |
| `workspaceOwnershipTransferred` | `workspaceOwnershipTransferredByOwner` | The new owner |
| `workspaceInviteCreated` | `workspaceInviteCreatedByAdmin` | The active account whose email matches the invite |
| `workspaceInviteRevoked` | `workspaceInviteRevokedByAdmin` | The active account whose email matches the invite |
| `workspaceInviteAccepted` | `workspaceInviteAcceptedByInvitee` | The inviter |
| `workspaceJoinAccepted` | `workspaceJoinAcceptedByAdmin` | The requester |
| `workspaceJoinRejected` | `workspaceJoinRejectedByAdmin` | The requester |
| `projectMemberAssigned` | `projectMemberAssignedByAdmin` | The assigned member |
| `projectMemberRoleUpdated` | `projectMemberRoleUpdatedByAdmin` | The target member |
| `projectMemberRemoved` | `projectMemberRemovedByAdmin` | The removed member |

- **Invites:** The invite actor row is written whether or not the email has an account. The target row is written only when the email belongs to an active account.
- **Admin onboarding:** Admin create and admin import also write `userSendVerificationEmail` and `workspaceCreatedByAdmin` (the personal workspace) for each new user. Every per-user row belongs to the new user and has `createdBy` set to the admin; only `adminUserCreate` / `adminUserImport` belongs to the admin. Sign-up writes `userSignedUp` and `userSendVerificationEmail`, social sign-up writes `userCreated`, and both write `workspaceCreated` for a personal workspace or the `workspaceInviteAccepted` pair for an invite token, with the new user as `createdBy`.
- **Self targets:** The admin single-session revoke and the admin device removal accept the admin's own account and then write the actor row only. Status change, temporary password, two-factor reset, and revoke-all reject the admin's own account with `UserNotSelfException` (400, `51001`) and write no row.
- **Single-row actions:** An action whose actor is the affected user writes one row under its plain name: every self-service `user…` action, `userRemoveDevice`, `userRevokeSession`, `workspaceCreated`, `workspaceUpdated`, `workspaceVisibilityUpdated`, `workspaceDeleted`, `workspaceSwitched`, `workspaceJoinRequested`, `workspaceMemberLeft`, `projectCreated`, `projectUpdated`, `projectDeleted`, and `projectMemberLeft`. An invite resend writes no row.
- **Revoke rows first:** An admin status change to `blocked` or `inactive` stages the revoke-all pair (`adminSessionRevokeAll` / `userRevokeAllSessionsByAdmin`, only when at least one session was revoked) before the status pair. Account self-deletion stages `userRevokeAllSessions` and then `userDeleteSelf`; the credential lockout stages `userRevokeAllSessions` and then `userReachMaxPasswordAttempt`. Both paths write both rows every time, including when no session was revoked. The password and two-factor paths that revoke every session write no revoke-all row.
- **Counting:** `ActivityLogWorkspaceVolumeContract` lists the eleven workspace and project target actions. Workspace volume metrics leave them out, so each paired workspace event counts once. `workspaceCreatedByAdmin` is not on the list, because the admin's row for the same event carries no workspace. See [Analytic][ref-doc-analytic].

## Data

Each flushed log contains:

- **userId** - the user the entry belongs to: the JWT user for a `payload` action, the staged `userId` for a `target` action
- **user** - the same user as `userId`, embedded on read
- **createdBy** - the user who performed the action (see [Actor and target rows](#actor-and-target-rows)); nullable in the response
- **action** - `EnumActivityLogAction`, a Prisma enum; a new member reaches MongoDB through `pnpm db:migrate`
- **description** - localized text from `ActivityLogUtil.getDescription` (`activityLog.<action>`)
- **ipAddress** - from the request store `IRequestLog` (may be null)
- **userAgent** - from the request store `IRequestLog` (JSON)
- **geoLocation** - from the request store `IRequestLog` (JSON, may be null)
- **metadata** - prepared metadata (JSON, null when empty)
- **workspaceId** - from the staged value, the current workspace store, or null when the contract is `workspace = none` (as with `userLoginFailed`)
- **createdAt** - timestamp

### Metadata

```typescript
type IActivityLogMetadata = Record<string, string | number | boolean | Date>;
```

Stored as `null` when empty. Each action's schema is a strict zod object, so a key the schema does not declare fails the contract when the event is prepared. Every id in the schemas below is required.

| Actions | Keys |
|---|---|
| `workspaceMemberRoleUpdated`, `workspaceMemberRemoved`, `workspaceOwnershipTransferred`, `workspaceInviteAccepted`, `workspaceJoinAccepted`, `workspaceJoinRejected`, `projectMemberAssigned`, `projectMemberRoleUpdated`, `projectMemberRemoved` | `targetUserId` |
| `workspaceInviteCreated`, `workspaceInviteRevoked` | `workspaceInviteId`, plus `targetUserId` when the email belongs to an active account |
| The eleven workspace and project target actions, `workspaceCreatedByAdmin` | `actorUserId` |
| `adminUserCreate`, `adminUserUpdateStatus`, `adminUserUpdatePassword`, `adminUserResetTwoFactor` | `targetUserId`, `targetUsername`, `timestamp` |
| `userCreatedByAdmin`, `userBlocked`, `userUpdateStatus`, `userUpdatePasswordByAdmin`, `userResetTwoFactorByAdmin` | `actorUserId`, `timestamp` |
| `adminUserImport` | `userCount` |
| `adminSessionRevoke` | `targetUserId`, `targetUsername`, `timestamp`, `sessionId` |
| `userRevokeSessionByAdmin` | `actorUserId`, `timestamp`, `sessionId` |
| `adminSessionRevokeAll` | `targetUserId`, `sessionCount` |
| `userRevokeAllSessionsByAdmin` | `actorUserId`, `sessionCount` |
| `adminDeviceRemove` | `targetUserId`, `targetUsername`, `timestamp`, `deviceOwnershipId`, `deviceId`, `sessionCount` |
| `userRemoveDeviceByAdmin` | `actorUserId`, `timestamp`, `deviceOwnershipId`, `deviceId`, `sessionCount` |
| `userRemoveDevice` | `deviceOwnershipId`, `deviceId`, `sessionCount` |
| API key, role, term policy, and notification setting actions | Their own schemas; every key optional |
| Every other action | None |

The response returns `metadata` through `ActivityLogMetadataResponseSchema`, which declares every key above as optional, types `timestamp` as a string, and is `null` when nothing was stored. A stored key the schema does not declare is stripped from the response. The schema lives in `dtos/response/activity-log.metadata.response.dto.ts`.

### Description

Built by `ActivityLogUtil.getDescription`, which resolves `activityLog.<action>` via `MessageService.setMessage`, passing the prepared metadata for placeholder interpolation. The text is rendered at flush and stored on the row. Strings live in `src/languages/<lang>/activityLog.json`. Target rows use fixed text with no placeholder ("Your workspace role has been updated"); the admin actor rows that carry `targetUsername` interpolate it ("Status of user {targetUsername} has been updated").


<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-response]: response.md
[ref-doc-message]: language-message.md
[ref-doc-pagination]: pagination.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-analytic]: analytic.md
