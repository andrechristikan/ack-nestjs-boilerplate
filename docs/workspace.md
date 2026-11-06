# Workspace Documentation

Workspace lives in `src/modules/workspace`.

## Overview

A workspace is the tenancy boundary.

- Every platform user belongs to at least one.
- Workspace-scoped `/user` routes select the active workspace through the **`x-workspace-id` request header**, never through the path.

The module covers four things:

- the workspace itself and its membership roles
- invites addressed to an email
- join requests raised against a public workspace
- the ownership rules that keep a workspace from ending up with nobody in charge

## Related Documents

- [Project][ref-doc-project]: Projects live inside a workspace
- [Authorization][ref-doc-authorization]: Where the workspace guards sit in the full protection stack
- [Security and Middleware][ref-doc-security-and-middleware]: How `x-workspace-id` reaches the guards
- [Feature Flag][ref-doc-feature-flag]: The `workspace` flag and its `invitationAllowed` / `joinRequestAllowed` metadata
- [Queue][ref-doc-queue]: The workspace queue that expires stale invites and join requests
- [Status Codes][ref-doc-status-codes]: The full `51600`-`51625` block

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Data Model](#data-model)
- [Selecting the Active Workspace](#selecting-the-active-workspace)
- [Guards and Decorators](#guards-and-decorators)
    - [WorkspaceProtected()](#workspaceprotected)
    - [WorkspaceMemberProtected(...roles)](#workspacememberprotectedroles)
    - [WorkspaceCurrent() / WorkspaceMemberCurrent()](#workspacecurrent--workspacemembercurrent)
    - [The /admin scope takes none of this](#the-admin-scope-takes-none-of-this)
- [Personal Workspace](#personal-workspace)
- [Endpoints](#endpoints)
    - [User Scope](#user-scope)
    - [Public Scope](#public-scope)
    - [Admin Scope](#admin-scope)
- [Roles and Ownership](#roles-and-ownership)
- [Invites](#invites)
- [Join Requests](#join-requests)
- [Slug](#slug)
- [Soft Delete](#soft-delete)
- [Activity Log](#activity-log)
- [Feature Flag Gating](#feature-flag-gating)
- [Configuration](#configuration)
- [Status Codes](#status-codes)

## Data Model

### `Workspace` (`Workspaces`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | ObjectId |
| `name` | `String` |  |
| `slug` | `String` | Globally unique |
| `description` | `String?` |  |
| `isPublic` | `Boolean` | Defaults to `false`. Only a public workspace accepts join requests |
| `createdAt` / `createdBy` | `DateTime` / `String?` |  |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` |  |
| `deletedAt` / `deletedBy` | `DateTime?` / `String?` | Soft-delete marker and the id of the user who deleted the workspace |

- `@@unique([slug])`
- Indexes:
    - `[isPublic, createdAt desc, id desc]` serves the admin list filtered by `isPublic` in the default `createdAt` order.
    - `[deletedAt, createdAt desc, id desc]` serves the live-row reads in `createdAt` order: the user's workspace list, which reads `Workspace` with `members: { some: { userId } }` under the active filter, and the analytic counts.
    - `[name, id]` serves the admin list sorted by `name`.
    - `[createdAt desc, id desc]` serves the admin list in the default order with no filter.

`WorkspaceResponseSchema` declares every audit column, `deletedBy` included, so each workspace row in a response carries it.

- The user routes read live rows only, so `deletedBy` is `null` there.
- The admin routes apply no live filter, so a soft-deleted row shows who deleted it.

### `WorkspaceMember` (`WorkspaceMembers`)

Fields:

- `workspaceId`, `userId`, `role` (`EnumWorkspaceMemberRole`), `joinedAt`
- plus the audit columns

Constraints:

- `@@unique([workspaceId, userId])`
- Indexes:
    - `[userId, role]` serves the per-user member reads: the count of workspaces a user owns, and the `userId` match in the user's workspace list.
    - `[workspaceId, role, createdAt desc, id desc]` serves the member list filtered by `role` in the default order, and the owner count and reviewer lookups of one workspace.
    - `[workspaceId, createdAt desc, id desc]` serves the member list of one workspace in the default order.
    - `[workspaceId, joinedAt, id]` serves the member list sorted by `joinedAt`.
- No soft-delete columns: removing a member is a hard delete.

A member row is created with `createdBy` and `updatedBy` set to the same user:

- `WorkspaceMemberRepository.createOwnerInTx`, called when a workspace is created, writes the owner
- `WorkspaceMemberRepository.createInTx` writes the acting user it receives: the reviewer on a join-request accept, the invitee on an invite accept, and the seed actor in the workspace seed

### `WorkspaceInvite` (`WorkspaceInvites`)

Fields:

- `workspaceId`, `email`, `workspaceRole`
- optional `projectId` + `projectRole`
- `token`, `reference`, `expiredAt`, `status`, `nonce`
- `invitedByUserId`, `acceptedAt`, `acceptedByUserId`

Constraints:

- `@@unique([token])`
- `@@unique([reference])`
- `@@unique([nonce])`
- Indexes:
    - `[workspaceId, status, createdAt desc, id desc]` serves the invite list filtered by `status` in the default order, and the bulk expiry of a workspace's pending invites.
    - `[workspaceId, createdAt desc, id desc]` serves the invite list of one workspace in the default order.
    - `[email, status]` serves the pending-invite check by invitee `email` and `status`.
    - `[status, expiredAt]` serves the expiry sweep that flips pending invites past `expiredAt` to `expired`.
    - `[projectId]` serves the clearing of `projectId` and `projectRole` on the pending invites of a deleted project.

**`token` stores the SHA-256 hash, never the plain token.**

- The plain token exists only in the invite link that is emailed.
- A lookup hashes the incoming token and matches on that.

**`nonce` keeps one pending invite per address in a workspace.**

- A pending invite carries the SHA-256 hash of `{workspaceId}:{email}`, so a second pending invite for that pair collides on the unique index.
- An invite that leaves `pending` (accepted, revoked, or expired) takes the SHA-256 hash of its own id, which frees the pair for a new invite.

### `WorkspaceJoinRequest` (`WorkspaceJoinRequests`)

`workspaceId`, `userId`, `status`, optional `message`, `rejectReasonCode`, `reviewedByUserId`, `reviewedAt`, `expiredAt`, `nonce`.

`nonce` works as on an invite: a pending request carries the SHA-256 hash of `{workspaceId}:{userId}`, which makes a second pending request from the same user a duplicate, and a request that leaves `pending` takes the hash of its own id. `@@unique([nonce])` enforces it.

Indexes:

- `[workspaceId, status, createdAt desc, id desc]` serves the join-request list filtered by `status` in the default order, and the bulk cancel of a workspace's pending requests.
- `[workspaceId, createdAt desc, id desc]` serves the join-request list of one workspace in the default order.
- `[userId, status]` serves the pending-request check by `userId` and `status`.
- `[status, expiredAt]` serves the expiry sweep that flips pending requests past `expiredAt` to `expired`.

### Enums

| Enum | Values |
| --- | --- |
| `EnumWorkspaceMemberRole` | `owner`, `admin`, `member` |
| `EnumWorkspaceInviteStatus` | `pending`, `accepted`, `revoked`, `expired` |
| `EnumWorkspaceJoinRequestStatus` | `pending`, `accepted`, `rejected`, `cancelled`, `expired` |
| `EnumWorkspaceJoinRejectReason` | `notAFit`, `incompleteProfile`, `spam`, `unknownRequester`, `wrongWorkspace`, `memberLimitReached`, `other` |
| `EnumWorkspaceInviteExpiry` | `threeDays` (3), `sevenDays` (7), `twoWeeks` (14), `oneMonth` (30) |

**Active filter.** `WorkspaceActiveFilter` is `[{ deletedAt: null }, { deletedAt: { isSet: false } }]`.

- Prisma's MongoDB connector compiles a bare `{ deletedAt: null }` into a query that also requires the field to be present, silently excluding rows written before the field existed.
- Every active-only read uses the `OR` form.

## Selecting the Active Workspace

1. `RequestWorkspaceMiddleware` copies the `x-workspace-id` header (`RequestWorkspaceIdHeaderName`) into the request store under `RequestWorkspaceIdStoreKey`, or `null` when the header is absent.
    - It performs no validation.
2. `WorkspaceGuard` reads that key, loads the active workspace, and stores the row under `WorkspaceStoreKey`.
    - A missing or empty header throws `WorkspaceHeaderMissingException` (400, `51621`).
    - An unknown, soft-deleted, or malformed id throws `WorkspaceNotFoundException` (404, `51600`).
3. `WorkspaceMemberGuard` then confirms the caller's membership and stores the `WorkspaceMember` row.

`POST /user/workspace/switch`:

- It takes the target id from the body.
- It re-runs the same two checks the guards would have run (the workspace resolves and is active, the caller is a member of it).
- It records the choice on `user.lastWorkspaceId` and `lastWorkspaceChangedAt`.
- It does **not** change how a request is scoped.
- The client still sends `x-workspace-id` on every workspace-scoped call.

Five user-scope routes carry no workspace header, because they act across workspaces or before membership exists:

- `list`
- `create`
- `switch`
- `invite/claim`
- `join-request/create`

## Guards and Decorators

- Located at `src/modules/workspace/decorators`.
- For where these sit in the full protection stack, see [Authorization][ref-doc-authorization].

### `WorkspaceProtected()`

**Method decorator** that applies `WorkspaceGuard`. Place it directly above `@UserProtected()`.

- Decorators apply bottom-up, so a decorator written lower in the source runs earlier. "Below" and "above" on this page mean position in the source.
- It requires `x-workspace-id` to resolve to an existing, non-deleted workspace, through `WorkspaceDomain.validateWorkspaceGuard`.
- It stores the row under `WorkspaceStoreKey`.
- A missing or empty header throws `WorkspaceHeaderMissingException` (400, `51621`).
- A malformed id (not a valid ObjectId) and a well-formed id that names no active workspace (unknown or soft-deleted) both throw `WorkspaceNotFoundException` (404, `51600`), so a caller cannot tell the cases apart.
- `WorkspaceGuard` has no guard-missing case. It reads the request workspace id that `RequestWorkspaceMiddleware` wrote, not a store that another guard wrote, so an absent id is the header error above.

### `WorkspaceMemberProtected(...roles)`

**Method decorator**. Stack it above `@WorkspaceProtected()`.

- With no arguments it applies `WorkspaceMemberGuard` alone.
- With roles it applies `WorkspaceMemberGuard` **and** `WorkspaceRoleGuard`.
- Each guard checks, at request time, the store that a guard running earlier wrote. No check for a missing or misordered guard runs when the route is decorated, so a route stacked in the wrong order boots and answers a guard-only exception on every request.

The two guards:

- `WorkspaceMemberGuard` confirms the user loaded by `UserGuard` has a `WorkspaceMember` row in the resolved workspace, and stores it under `WorkspaceMemberStoreKey`.
    - An empty user store throws `UserGuardMissingException` (401, `51023`).
    - An empty workspace store throws `WorkspaceGuardMissingException` (403, `51622`).
    - No membership throws `WorkspaceMemberForbiddenException` (403, `51601`).
- `WorkspaceRoleGuard` enforces the declared roles against that stored membership.
    - An empty workspace member store throws `WorkspaceMemberGuardMissingException` (403, `51623`).
    - A mismatch throws `WorkspaceRoleForbiddenException` (403, `51602`).
    - **The `owner` role always passes, whatever roles were declared.**
        - Owner is never listed in a route's `allowedRoles`.
        - Folding it in would make every `@WorkspaceMemberProtected(admin)` route reject the owner.

### `WorkspaceCurrent()` / `WorkspaceMemberCurrent()`

**Parameter decorators** that read back the `Workspace` and `WorkspaceMember` the guards stored.

- Each takes an optional field name typed against its model: `@WorkspaceCurrent()` returns the whole row, `@WorkspaceCurrent('id')` returns that field
- Both return a non-null value.
    - A route that reads one without the matching guard answers the guard-only exception of that store: `WorkspaceGuardMissingException` (403, `51622`) for `WorkspaceCurrent()`, `WorkspaceMemberGuardMissingException` (403, `51623`) for `WorkspaceMemberCurrent()`.
    - A field name that holds `null` answers `RequestContextMissingException` (500, `50304`)

See [Security and Middleware][ref-doc-security-and-middleware].

### The `/admin` scope takes none of this

- Admin routes reach the same resources through `@RoleProtected()` + `@PolicyProtected()` and take the workspace id from the **path**.
- They never read `x-workspace-id` and never carry a workspace guard.

## Personal Workspace

`UserCreateUtil.buildPersonalWorkspaceContexts` builds a workspace named from `workspace.personalNamePattern` (`{username}'s Workspace`) with a generated slug.

Each creating HTTP service opens `withTransaction`: `UserRegistrationHttpService` (self sign-up, admin create, admin CSV import) and `UserAuthHttpService` (social sign-up). Inside it:

1. `TermPolicyAcceptanceDomain.assertRequiredPublishedInTx` checks that the required policies are published (sign-up paths only)
2. `UserDomain.createManyInTx` writes the User rows, with `lastWorkspaceId` and `lastWorkspaceChangedAt` set to the resolved workspace
3. `PasswordHistoryDomain.createManyInTx` writes the password history rows
4. `NotificationDomain.createDefaultsManyInTx` writes the default notification settings
5. `WorkspaceDomain.createOwnedForUsersInTx` writes each personal workspace plus its owner membership
6. `WorkspaceInviteDomain.acceptOnSignUpInTx` joins an invite-token sign-up, and a project membership follows when the invite carried one
7. `TermPolicyAcceptanceDomain.acceptPublishedManyInTx` writes the accepted policies

- After the commit, the service prepares the activity logs of the user-creation contract and stages them with `ActivityLogDomain.stagePrepared`.
- `ActivityLogInterceptor` writes them once the handler returns.
- The rows are listed under [Activity Log](#activity-log).

`buildPersonalWorkspaceContexts` draws `workspace.slugMaxAttempts` (5) slug candidates per row and carries them on the context as `slugCandidates`.

- The `withTransaction` runs with the first candidate.
- A unique collision on `slug` rolls the transaction back, and the next candidate is tried.
- Running out of candidates raises `DatabaseUniqueValueGenerationFailedException` (409, `51800`), so the caller never sees a leaked Prisma error.
- Admin CSV import writes all its rows in one `withTransaction`. It substitutes the same candidate index into every personal row of the batch and retries the whole batch, up to the smallest candidate count in it.

| User-creation path | Personal workspace                     |
| ------------------ | -------------------------------------- |
| Admin create       | Always                                 |
| Admin CSV import   | Always, one per row                    |
| Self sign-up       | Only when no `inviteToken` is supplied |
| Social sign-up     | Only when no `inviteToken` is supplied |

- **A sign-up that carries a valid invite token joins the inviting workspace instead and gets no personal workspace.** The new user lands where they were invited.
- All paths set `user.lastWorkspaceId` and `lastWorkspaceChangedAt` to the resolved workspace.
- Every path records an acceptance of the required policies for the new user (see [Term Policy][ref-doc-term-policy]).

## Endpoints

- Global prefix `/api` and version prefix `v1` apply as elsewhere.
- The controller path is `/workspace` in all three scopes.

### User Scope

- Mounted under `/user`.
- Every route carries `@FeatureFlagProtected('workspace')`.

| Method | Path | Header | Minimum role |
| --- | --- | --- | --- |
| `GET` | `/user/workspace/list` | no | authenticated |
| `POST` | `/user/workspace/create` | no | authenticated |
| `GET` | `/user/workspace/get` | yes | `member` |
| `PUT` | `/user/workspace/update` | yes | `admin` |
| `PATCH` | `/user/workspace/update/is-public` | yes | `admin` |
| `PATCH` | `/user/workspace/update/slug` | yes | `admin` |
| `POST` | `/user/workspace/switch` | no | authenticated |
| `POST` | `/user/workspace/ownership/transfer` | yes | `owner` |
| `POST` | `/user/workspace/leave` | yes | `member` |
| `DELETE` | `/user/workspace/delete` | yes | `owner` |
| `GET` | `/user/workspace/member/list` | yes | `member` |
| `PATCH` | `/user/workspace/member/:workspaceMemberId/role/update` | yes | `admin` |
| `DELETE` | `/user/workspace/member/:workspaceMemberId/remove` | yes | `admin` |
| `GET` | `/user/workspace/invite/list` | yes | `admin` |
| `POST` | `/user/workspace/invite/create` | yes | `admin` |
| `POST` | `/user/workspace/invite/:workspaceInviteId/resend` | yes | `admin` |
| `DELETE` | `/user/workspace/invite/:workspaceInviteId/revoke` | yes | `admin` |
| `POST` | `/user/workspace/invite/claim` | no | authenticated |
| `POST` | `/user/workspace/join-request/create` | no | authenticated |
| `GET` | `/user/workspace/join-request/list` | yes | `admin` |
| `POST` | `/user/workspace/join-request/:workspaceJoinRequestId/accept` | yes | `admin` |
| `POST` | `/user/workspace/join-request/:workspaceJoinRequestId/reject` | yes | `admin` |

- The `owner` role satisfies every `admin` and `member` requirement above.
- `PUT /user/workspace/update` replaces the workspace. The body carries both fields:
    - `name` is required, 1 to 150 characters.
    - `description` is required and nullable, up to 500 characters. `null` clears it.
- The list routes take `search` and `orderBy` query params. `orderBy` is `field:direction`, repeatable, and each route's request schema validates it against that route's allow-list, so an unlisted field answers a validation error (422, `50300`). The allow-list also rides in the response metadata as `availableOrderBy`.
- Current-workspace analytic metrics for the active `x-workspace-id` live under `/user/analytic/workspace/*`. See [Analytic](analytic.md).
    - The summary is open to any member.
    - Invite funnel, join outcomes, member roles, and activity are for workspace admin.

### Public Scope

- Mounted under `/public`.
- Unauthenticated, but still behind `@ApiKeyProtected()` and `@FeatureFlagProtected('workspace')`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/public/workspace/invite/preview` | Takes `inviteToken` in the body and shows workspace name, inviter name, offered role, and expiry for a pending invite. Nothing else |
| `GET` | `/public/workspace/preview/:slug` | Shows a **public** workspace: `id`, `name`, `slug`, `description`, and the `createdAt` / `updatedAt` / `deletedAt` timestamps |

The slug preview excludes the `createdBy` / `updatedBy` / `deletedBy` audit columns, so it never names who runs the workspace.

Neither preview answers `forbidden` for a resource that exists but is not eligible, so nothing can be probed:

- The slug preview collapses "private", "deleted", and "unknown" into `notFound` (404, `51600`).
- The invite preview collapses an unknown, expired, non-pending, or dead-workspace token into `inviteInvalid` (400, `51603`).

### Admin Scope

- Mounted under `/admin`.
- Gated by `@RoleProtected(EnumRoleType.admin)` + `@PolicyProtected({ subject: workspace, action: [read] })`.

These routes are:

- **not** feature-flagged
- read-only
- blind to `x-workspace-id`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/workspace/list` | All workspaces including soft-deleted. Optional `isPublic` filter |
| `GET` | `/admin/workspace/get/:workspaceId` | Any workspace by id, with no active filter |
| `GET` | `/admin/workspace/member/:workspaceId/list` | Members of any workspace |

- Both admin list routes (`/admin/workspace/list` and `/admin/workspace/member/:workspaceId/list`) take `orderBy` and validate it in zod, the same way the user lists do.
- `WorkspaceAdminListRequestSchema` checks it against `WorkspaceDefaultAvailableOrderBy`, and `WorkspaceAdminMemberListRequestSchema` against `WorkspaceMemberDefaultAvailableOrderBy`.
- An unlisted field answers a validation error (422, `50300`).

## Roles and Ownership

| Role | May |
| --- | --- |
| `member` | Read the workspace, list members, leave |
| `admin` | Everything a `member` may, plus update the workspace, manage members, and manage invites and join requests |
| `owner` | Everything, plus transfer ownership and soft-delete the workspace |

**`owner` short-circuits the role guard.** It is never listed in a route's allowed roles, because folding it in would make every `admin`-gated route reject the owner.

**Peer rules** throw `WorkspaceMemberPeerForbiddenException` (403, `51608`). `assertPeerActionAllowed`, called on member role update and member removal, covers:

- the target is an `owner`, or
- the actor is an `admin` and the target is an `admin`.

`updateMemberRole` and `removeMember` each add one check of their own, ahead of that call:

- An actor who targets their own membership row is rejected with the same exception, on a role update and on a removal.
- A member who wants out calls `POST /user/workspace/leave`.

**Transfer ownership**:

- It promotes the target to `owner` and demotes the actor to `admin` in one transaction, which `WorkspaceMemberDomain` opens through `withTransaction`.
- Transferring to yourself throws `WorkspaceSelfTransferException` (400, `51619`).
- A non-member target throws `WorkspaceMemberNotFoundException` (404, `51606`).
- A target who already owns `workspace.maxWorkspacesPerUser` workspaces throws `WorkspaceCapReachedException` (400, `51604`).
- A role change that loses a race with another write to either member row throws `WorkspaceMemberPeerForbiddenException`.

**Leave** hard-deletes the caller's membership in one transaction.

- The `owner` cannot leave: `WorkspaceLastOwnerException` (400, `51607`).
- Transfer ownership first.
- The same transaction removes the caller's project memberships in the workspace, cancels the caller's pending join request to it, and clears `lastWorkspaceId` when it points at the workspace.

**Remove member** runs the same cleanup for the removed member, and also revokes the pending invite addressed to the removed member's email in that workspace.

**Account deletion** soft-deletes the workspaces the user owns when they have no other members. An owned workspace with other members throws `WorkspaceOwnerTransferRequiredException` (400, `51625`), so the owner transfers ownership first.

**Workspace cap.** `workspace.maxWorkspacesPerUser` (10) counts memberships with role `owner` on non-deleted workspaces.

- It is enforced in `POST /user/workspace/create` and for the target of an ownership transfer, throwing `WorkspaceCapReachedException` (400, `51604`).
- Personal workspaces created during user creation, invite claims, and join-request acceptance do not consult the cap.

## Invites

An invite is addressed to an email, not to a user, so it works whether or not that address already has an account.

**Create.** `POST /user/workspace/invite/create` requires `admin`. Steps:

1. Generates a random token and stores only its SHA-256 hash
2. Mints a `WIN-` prefixed reference
3. Draws the invite id with `DatabaseUtil.createId()` before the write, so the activity rows that carry `workspaceInviteId` are prepared before the invite exists
4. Retries the token and reference up to `workspace.invite.referenceMaxAttempts` (5) times on a collision, then throws `DatabaseUniqueValueGenerationFailedException` (409, `51800`)

Constraints:

- `projectId` and `projectRole` are supplied together or not at all (`WorkspaceInviteRoleRequiredException`, 400, `51611`)
- the project belongs to this workspace (`WorkspaceInviteProjectMismatchException`, 400, `51610`)
- an address that already belongs to a member of the workspace throws `WorkspaceMemberAlreadyExistsException` (400, `51624`)
- a second pending invite to the same address in the same workspace throws `WorkspaceInviteDuplicateException` (400, `51609`)
- a pending invite for that address that is already past `expiredAt` is flipped to `expired` and does not block the new invite

**Expiry** comes from the request's `expiryDuration` (`EnumWorkspaceInviteExpiry`), defaulting to `workspace.invite.expiredInDays` (7).

**Delivery.** `createInviteTokenData` mints two links from the one plain token:

- claim link from `workspace.invite.linkPattern` (`{homeUrl}/workspace/invites?inviteToken={token}`)
- sign-up link from `workspace.invite.signUpLinkPattern` (`{homeUrl}/sign-up?inviteToken={token}`)

Create and resend look the invited address up among active users. `sendInviteNotification` picks one of two deliveries from that result:

- an address that already has an active account is sent the claim link through the `workspaceInvite` notification process
    - `WorkspaceInviteHttpService` reads the invitee's recipient snapshot through `NotificationDomain.getRecipient`: address, username, the channels the user's notification settings leave enabled, and device tokens.
    - `NotificationQueue` seals the address, the tokens, and the link with that user's `userId` as authenticated data.
- an address with no account is sent the sign-up link through `workspaceInviteUnregistered`
    - `NotificationEmailQueue` seals the address (`encryptedEmail` in the job's `send` block) and the link (`encryptedInviteAcceptLink`) with the invite `reference` as authenticated data.

Create and resend read the snapshot before their write, so the processor reads no user record afterwards.

The enqueue runs after the write commits:

- `sendInviteNotification` awaits the queue methods directly. They enqueue through `QueueBase.addSideEffect`, so a failed enqueue is logged and reported to Sentry and the create or resend still answers success.
- The `workspaceInvite` job id is `workspaceInvite-{reference}`, and a resend rotates the reference, so each resend queues a fresh job.

The two processes share one SES template.

See [Notification][ref-doc-notification] for the payload encryption.

**Resend** rotates the token, reference, and expiry, then sends again.

- It reads the active account for the address once, and that lookup serves both the notification snapshot and the activity rows.
- It prepares `workspaceInviteResent` for the actor and, when the address belongs to an active account other than the actor, `workspaceInviteResentByAdmin` for that account.
- It stages them after the rotation commits, before the notification is enqueued.

- Its body is optional and carries `expiryDuration` alone (`WorkspaceInviteResendRequestSchema`, a `.pick()` of the create schema).
- Omitting it falls back to `workspace.invite.expiredInDays` (7) rather than to the duration the original invite was created with.
- Only a `pending` invite may be resent or revoked, otherwise `WorkspaceInviteAlreadyProcessedException` (400, `51613`).
- A pending invite already past `expiredAt` cannot be resent: it throws `WorkspaceInviteInvalidException` (400, `51603`).
- An invite id that does not belong to the workspace throws `WorkspaceInviteNotFoundException` (404, `51612`).
- The rotation matches the invite only while it is `pending`, so a resend never revives an accepted, revoked, or expired invite. A resend that loses a race with another write to the same invite, including a MongoDB write conflict, answers the same `400` `inviteAlreadyProcessed`, never `409`.
- **Revoke** flips the invite to `revoked` only while it is `pending`. An invite that is not pending when read, or that stops being pending before the write, answers the same `400` `inviteAlreadyProcessed`.

**Pending guard.** Every write that ends an invite's pending state matches `status: pending` in the same statement:

- revoke, resend, claim, and accept on sign-up
- A statement that matches no row means another request got there first, and the caller answers `WorkspaceInviteAlreadyProcessedException` (400, `51613`).
- Claim and accept on sign-up run this statement inside their transaction, so the membership rows written before it roll back with it.
- A MongoDB write conflict on the claim, the sign-up accept, or the resend maps to the same `400`, never `409`.

**Claim.** `POST /user/workspace/invite/claim` is for an already-authenticated user.

Preconditions (anything else collapses into `WorkspaceInviteInvalidException` (400, `51603`)):

- the token hashes to a `pending`, unexpired invite on an active workspace
- the invite email matches the caller's email (case-insensitive)

A race that consumes the invite after those checks pass answers `WorkspaceInviteAlreadyProcessedException` (400, `51613`) and writes nothing. A caller who is already a member of the workspace gets the same answer, because the membership insert collides on the unique index and the transaction rolls back.

On success one transaction:

1. creates the membership with `invite.workspaceRole`
2. marks the invite `accepted` with `acceptedAt` / `acceptedByUserId`
3. sets `user.lastWorkspaceId` and `lastWorkspaceChangedAt` to the joined workspace
4. creates the project membership when the invite carried one

The `workspaceInviteAccepted` / `workspaceInviteAcceptedByInvitee` pair is prepared before the transaction and staged after it commits.

- A user who has no account yet redeems the invite through sign-up instead, by passing `inviteToken`. The accept inside the sign-up transaction is guarded on `pending` too: an invite consumed between the token check and the commit fails the sign-up with `400` `inviteAlreadyProcessed` and creates no user.
- See [Personal Workspace](#personal-workspace).

**Expiry sweep.** `WorkspaceProcessorService.onModuleInit` calls `WorkspaceQueue.scheduleInviteExpirySweep` and `WorkspaceQueue.scheduleJoinRequestExpirySweep`:

- Each registers a recurring BullMQ job through `upsertJobScheduler` on the `workspace` queue: `expireStaleInvites` and `expireStaleJoinRequests`.
- Both use the cron `workspace.invite.expirySweepCron` (`0 * * * *`), in the app timezone, at `low` priority.
- Each scheduler is registered with `immediately: true`, so a sweep also runs at boot rather than waiting for the first cron tick.
- `expireStaleInvites` flips every `pending` invite past its `expiredAt` to `expired`, in chunks of `workspace.invite.expireChunkSize` (100).
- `expireStaleJoinRequests` flips every `pending` join request past its `expiredAt` to `expired`, in chunks of `workspace.joinRequest.expireChunkSize` (100).

## Join Requests

- A user asks to join a workspace they can see.
- An admin decides.
- Only a workspace with `isPublic: true` accepts requests. A private one throws `WorkspaceNotPublicException` (400, `51614`).
- Already being a member throws `WorkspaceJoinRequestAlreadyMemberException` (400, `51615`).
- A second pending request throws `WorkspaceJoinRequestDuplicateException` (400, `51616`).
- A request expires `workspace.joinRequest.expiresInMs` (7 days) after it is created. Accept and reject match a request only while it is `pending` and unexpired, so a request past `expiredAt` answers `WorkspaceJoinRequestAlreadyProcessedException` (400, `51618`) until the sweep flips it to `expired`.
- On create, every active reviewer (`owner` and `admin`) is notified.
    - The reviewer ids come from `WorkspaceMemberRepository.findReviewersByWorkspace`, and `UserDomain.getManyActiveByIds` keeps the active users among them.
    - Each reviewer gets a recipient snapshot from `NotificationDomain.getRecipient` (address, username, channels, device tokens), read before the request row is written.
    - Each reviewer's review link is sealed (AES-256-GCM) with **that reviewer's** user id as authenticated data.
    - A link sealed for one reviewer therefore does not open in another reviewer's job.
    - `NotificationQueue.sendWorkspaceJoinRequestBulk` adds the jobs of every reviewer in one `addBulk`, each under the job id `workspaceJoinRequest-{joinRequestId}-{userId}`.
    - A failed enqueue is logged and reported, and the request still answers success.
- **Accept always creates a `member` membership.** The role is not configurable on this path.
    - The membership creation and the status flip to `accepted` with `reviewedByUserId` / `reviewedAt` run in one transaction.
    - The activity pair is prepared before the transaction and staged after it commits.
- Reject is a single guarded update with no transaction.
- Accept does **not** point the requester's `lastWorkspaceId` at the workspace they just joined, unlike an invite claim.
- The requester switches to the workspace themselves.
- Reject requires a `rejectReasonCode` from `EnumWorkspaceJoinRejectReason`.
- Both outcomes notify the requester once the write commits: `workspaceJoinAccepted` on accept, `workspaceJoinRejected` (carrying the reason code) on reject.
    - The requester is read with `UserDomain.getOneActive`, then `NotificationDomain.getRecipient` builds the recipient snapshot, both before the write.
    - A requester who is not an active user gets no notification, and the write still completes.
    - The job id is `{process}-{joinRequestId}-{userId}`, and a failed enqueue is logged and reported without changing the outcome.
- Only a `pending` request may be accepted or rejected, otherwise `WorkspaceJoinRequestAlreadyProcessedException` (400, `51618`).
- An id that does not belong to the resolved workspace is `WorkspaceJoinRequestNotFoundException` (404, `51617`).

The `cancelled` status is written by these paths:

- workspace soft-delete cancels every pending request to the workspace
- leaving or being removed from the workspace cancels the member's pending request to it
- account deletion cancels the user's pending requests

A pending request already past `expiredAt` becomes `expired` instead of `cancelled` on those paths.

A requester has no endpoint to withdraw their own request.

## Slug

- **Creation always generates the slug.**
    - `WorkspaceCreateRequestDto` carries no slug field.
    - `WorkspaceDomain.createWorkspace` draws `workspace.slugMaxAttempts` (5) candidates of `workspace.slugPrefix` plus random characters up to `slugMaxLength`, and walks them itself.
    - Choosing a slug is what `PATCH /user/workspace/update/slug` is for.
- `WorkspaceDomain.updateWorkspaceSlug` validates a slug sent to `update/slug` through `WorkspaceUtil.isSlugAllowed` against `workspace.slugRegex` and `workspace.slugMaxLength`, throwing `WorkspaceSlugInvalidException` (400, `51620`).
    - It then writes the slug. A unique collision on `slug` answers `WorkspaceSlugAlreadyExistsException` (400, `51605`) with no retry.
- Uniqueness is **global**, matching `@@unique([slug])`.
    - The unique index has no `deletedAt` component, so a soft-deleted workspace still holds its slug.
- `createWorkspace` walks its candidates and, for each one:
    1. draws the workspace id
    2. prepares `workspaceCreated`
    3. opens a `withTransaction` that calls `createInTx` (`WorkspaceRepository.createInTx` plus `WorkspaceMemberRepository.createOwnerInTx`)
- Around that loop:
    - The activity log is staged only after a commit.
    - A unique collision on `slug`, recognised by `DatabaseUtil.isUniqueCollision`, moves to the next candidate.
    - An `AppBaseException` passes through, and any other error is wrapped in `AppUnknownException`.
    - Exhausting the candidates throws `DatabaseUniqueValueGenerationFailedException` (409, `51800`).
- The personal-workspace slug follows the same budget inside the onboarding transaction, ending in the same `DatabaseUniqueValueGenerationFailedException` (409, `51800`). See [Generated Unique Values][ref-doc-database-generated-unique-values].

## Soft Delete

`DELETE /user/workspace/delete` requires `owner`. `WorkspaceHttpService.softDeleteWorkspace` prepares `workspaceDeleted`, then opens one `withTransaction` with the timeout `workspace.delete.timeoutInMs` (10 seconds):

1. `WorkspaceDomain.softDeleteInTx` sets `deletedAt` and stamps `deletedBy` and `updatedBy` from the caller.
2. `ProjectDomain.softDeleteByWorkspaceInTx` soft-deletes every still-active project in it with the same `deletedAt` and `deletedBy` set to the caller.
3. `WorkspaceInviteDomain.revokePendingByWorkspaceInTx` flips every `pending` invite to `revoked`, or to `expired` when it is already past `expiredAt`.
4. `WorkspaceJoinRequestDomain.cancelPendingByWorkspaceInTx` flips every `pending` join request to `cancelled`, or to `expired` when it is already past `expiredAt`.

- A workspace that is already deleted, or a write conflict in the transaction, throws `WorkspaceNotFoundException` (404, `51600`).
- After the commit, `workspaceDeleted` is staged and `ActivityLogInterceptor` writes it after the handler returns.

**Not cascaded:**

- `WorkspaceMember` rows stay as they are.
- `user.lastWorkspaceId` is not cleared for members still pointing at the deleted workspace.
- The slug stays occupied.
- There is no restore.

## Activity Log

- Workspace actions prepare their rows with `ActivityLogDomain.prepare` before the write and stage them with `ActivityLogDomain.stagePrepared` after it.
- `ActivityLogInterceptor` writes them once the handler returns.
- Every row in the table below carries the workspace id.
- An action taken on another user writes an actor row for the caller, carrying `targetUserId`, and a target row for the affected user, carrying `actorUserId`, with `createdBy` set to the caller.
- When the affected user is the caller, only the actor row is written.
    - Member role update and member removal reject a self target, so both rows are always written for them.

| Operation | Actor row (caller) | Target row | Target row owner |
| --- | --- | --- | --- |
| Member role update | `workspaceMemberRoleUpdated` | `workspaceMemberRoleUpdatedByAdmin` | The target member |
| Member removal | `workspaceMemberRemoved` | `workspaceMemberRemovedByAdmin` | The removed member |
| Ownership transfer | `workspaceOwnershipTransferred` | `workspaceOwnershipTransferredByOwner` | The new owner |
| Invite create | `workspaceInviteCreated` | `workspaceInviteCreatedByAdmin` | The active account whose email matches the invite |
| Invite resend | `workspaceInviteResent` | `workspaceInviteResentByAdmin` | The active account whose email matches the invite |
| Invite revoke | `workspaceInviteRevoked` | `workspaceInviteRevokedByAdmin` | The active account whose email matches the invite |
| Invite claim, or sign-up with `inviteToken` | `workspaceInviteAccepted` (the invitee) | `workspaceInviteAcceptedByInvitee` | The inviter |
| Join request accept | `workspaceJoinAccepted` (the reviewer) | `workspaceJoinAcceptedByAdmin` | The requester |
| Join request reject | `workspaceJoinRejected` (the reviewer) | `workspaceJoinRejectedByAdmin` | The requester |

**Invites**

- The invite actor row carries `workspaceInviteId`, and also `targetUserId` when the email belongs to an active account.
- An email with no account gets no target row.

**Onboarding**

- Every per-user onboarding row belongs to the new user, except the invite-accept target row, which belongs to the inviter.
- A sign-up writes `userSignedUp` and `userSendVerificationEmail`.
- A social sign-up writes `userCreated`.
- Both write `workspaceCreated` for a personal workspace, with `createdBy` set to the new user.
- A sign-up through `inviteToken` writes the invite-accept pair above in place of `workspaceCreated`, and the new user is the `createdBy` of both rows.
- Admin create and admin CSV import write `userCreatedByAdmin` and `workspaceCreatedByAdmin` for each new user with `createdBy` set to the admin.
- Admin create and admin CSV import also write one `adminUserCreate` or `adminUserImport` row for the admin.

**Single rows**

`workspaceCreated`, `workspaceUpdated`, `workspaceVisibilityUpdated`, `workspaceSwitched`, `workspaceDeleted`, `workspaceJoinRequested`, and `workspaceMemberLeft` belong to the caller alone.

**Metrics**

- Workspace volume metrics leave the target actions out, so each paired action counts once.
- See [Analytic][ref-doc-analytic].

Row shapes and the response: [Activity Log][ref-doc-activity-log].

## Feature Flag Gating

Two layers, and they are not the same check.

**Route level.** `@FeatureFlagProtected('workspace')` sits on all 22 user-scope routes and both public-scope routes.

- Turning the `workspace` flag off closes that whole surface.
- Admin-scope routes are not flagged and stay reachable.

**Metadata level.** Two sub-keys on the same flag are asserted inside the owning domain, at the point where they govern behaviour:

| Sub-key | Gates |
| --- | --- |
| `invitationAllowed` | invite list, create, resend, revoke, claim, public preview, and a sign-up that carries `inviteToken` |
| `joinRequestAllowed` | public workspace preview by slug, join request create, list, accept, reject |

- Both default to `true` in the seed.
- With `invitationAllowed` off, the invite queue is frozen: an operator cannot list, revoke, or redeem around existing invites until they expire.
- A flag is never an authorization boundary. See [Feature Flag][ref-doc-feature-flag].

## Configuration

`src/configs/workspace.config.ts`:

```typescript
{
  maxWorkspacesPerUser: 10,
  personalNamePattern: "{username}'s Workspace",
  slugPrefix: 'w-',
  slugRegex: /^[0-9a-zA-Z-]+$/,
  slugMaxLength: 30,
  slugMaxAttempts: 5,
  delete: {
    timeoutInMs: ms('10s')
  },
  invite: {
    expiredInDays: 7,
    tokenLength: 100,
    referencePrefix: 'WIN',
    referenceRandomLength: 25,
    referenceMaxAttempts: 5,
    expireChunkSize: 100,
    linkPattern: '{homeUrl}/workspace/invites?inviteToken={token}',
    signUpLinkPattern: '{homeUrl}/sign-up?inviteToken={token}',
    expirySweepCron: '0 * * * *'
  },
  joinRequest: {
    reviewLinkPattern: '{homeUrl}/workspace/join-requests/{joinRequestId}',
    expiresInMs: ms('7d'),
    expireChunkSize: 100
  }
}
```

- Each link key is a full URL template.
- `{homeUrl}` is filled from `home.url`, so one host value serves all three.

## Status Codes

| Member                        | statusCode | httpStatus |
| ----------------------------- | ---------- | ---------- |
| `notFound`                    | `51600`    | 404        |
| `memberForbidden`             | `51601`    | 403        |
| `roleForbidden`               | `51602`    | 403        |
| `inviteInvalid`               | `51603`    | 400        |
| `capReached`                  | `51604`    | 400        |
| `slugAlreadyExists`           | `51605`    | 400        |
| `memberNotFound`              | `51606`    | 404        |
| `lastOwner`                   | `51607`    | 400        |
| `memberPeerForbidden`         | `51608`    | 403        |
| `inviteDuplicate`             | `51609`    | 400        |
| `inviteProjectMismatch`       | `51610`    | 400        |
| `inviteRoleRequired`          | `51611`    | 400        |
| `inviteNotFound`              | `51612`    | 404        |
| `inviteAlreadyProcessed`      | `51613`    | 400        |
| `notPublic`                   | `51614`    | 400        |
| `joinRequestAlreadyMember`    | `51615`    | 400        |
| `joinRequestDuplicate`        | `51616`    | 400        |
| `joinRequestNotFound`         | `51617`    | 404        |
| `joinRequestAlreadyProcessed` | `51618`    | 400        |
| `selfTransfer`                | `51619`    | 400        |
| `slugInvalid`                 | `51620`    | 400        |
| `headerMissing`               | `51621`    | 400        |
| `guardMissing`                | `51622`    | 403        |
| `memberGuardMissing`          | `51623`    | 403        |
| `memberAlreadyExists`         | `51624`    | 400        |
| `ownerTransferRequired`       | `51625`    | 400        |

Full catalog: [Status Codes][ref-doc-status-codes].

<!-- REFERENCES -->

[ref-doc-project]: project.md
[ref-doc-authorization]: authorization.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-queue]: queue.md
[ref-doc-status-codes]: status-codes.md
[ref-doc-database-generated-unique-values]: database.md#generated-unique-values
[ref-doc-notification]: notification.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-analytic]: analytic.md
