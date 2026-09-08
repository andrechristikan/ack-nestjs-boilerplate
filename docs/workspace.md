# Workspace Documentation

This documentation explains the features and usage of the **Workspace Module**: Located at `src/modules/workspace`

## Overview

A workspace is the tenancy boundary. Every platform user belongs to at least one, and workspace-scoped `/user` routes select the active workspace through the **`x-workspace-id` request header**, never through the path.

The module covers four things: the workspace itself and its membership roles, invites addressed to an email, join requests raised against a public workspace, and the ownership rules that keep a workspace from ending up with nobody in charge.

## Related Documents

- [Project][ref-doc-project] - Projects live inside a workspace
- [Authorization][ref-doc-authorization] - Where the workspace guards sit in the full protection stack
- [Security and Middleware][ref-doc-security-and-middleware] - How `x-workspace-id` reaches the guards
- [Feature Flag][ref-doc-feature-flag] - The `workspace` flag and its `invitationAllowed` / `joinRequestAllowed` metadata
- [Queue][ref-doc-queue] - The workspace queue that expires stale invites
- [Status Codes][ref-doc-status-codes] - The full `51600`-`51620` block

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
- [Feature Flag Gating](#feature-flag-gating)
- [Configuration](#configuration)
- [Status Codes](#status-codes)
- [Contribution](#contribution)

## Data Model

### `Workspace` (`Workspaces`)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | ObjectId |
| `name` | `String` | |
| `slug` | `String` | Globally unique |
| `description` | `String?` | |
| `isPublic` | `Boolean` | Defaults to `false`. Only a public workspace accepts join requests |
| `createdAt` / `createdBy` | `DateTime` / `String?` | |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` | |
| `deletedAt` | `DateTime?` | Soft-delete marker. There is no `deletedBy` on this model |

`@@unique([slug])`; indexed on `[isPublic, deletedAt, createdAt desc]`, `[deletedAt, createdAt desc, id desc]`, `[deletedAt, name]`.

### `WorkspaceMember` (`WorkspaceMembers`)

`workspaceId`, `userId`, `role` (`EnumWorkspaceMemberRole`), `joinedAt`, plus the audit columns. `@@unique([workspaceId, userId])`. No soft-delete columns: removing a member is a hard delete.

### `WorkspaceInvite` (`WorkspaceInvites`)

`workspaceId`, `email`, `workspaceRole`, optional `projectId` + `projectRole`, `token`, `reference`, `expiredAt`, `status`, `invitedByUserId`, `acceptedAt`, `acceptedByUserId`. `@@unique([token])` and `@@unique([reference])`.

**`token` stores the SHA-256 hash, never the plain token.** The plain token exists only in the invite link that is emailed; a lookup hashes the incoming token and matches on that.

### `WorkspaceJoinRequest` (`WorkspaceJoinRequests`)

`workspaceId`, `userId`, `status`, optional `message`, `rejectReasonCode`, `reviewedByUserId`, `reviewedAt`.

### Enums

| Enum | Values |
|---|---|
| `EnumWorkspaceMemberRole` | `owner`, `admin`, `member` |
| `EnumWorkspaceInviteStatus` | `pending`, `accepted`, `revoked`, `expired` |
| `EnumWorkspaceJoinRequestStatus` | `pending`, `accepted`, `rejected`, `cancelled` |
| `EnumWorkspaceJoinRejectReason` | `notAFit`, `incompleteProfile`, `spam`, `unknownRequester`, `wrongWorkspace`, `memberLimitReached`, `other` |
| `EnumWorkspaceInviteExpiry` | `threeDays` (3), `sevenDays` (7), `twoWeeks` (14), `oneMonth` (30) |

**Active filter.** `WorkspaceActiveFilter` is `[{ deletedAt: null }, { deletedAt: { isSet: false } }]`. Prisma's MongoDB connector compiles a bare `{ deletedAt: null }` into a query that also requires the field to be present, silently excluding rows written before the field existed. Every active-only read uses the `OR` form.

## Selecting the Active Workspace

1. `RequestWorkspaceMiddleware` copies the `x-workspace-id` header into the request store under the key from `workspace.storeKey` (`workspaceId`), or `null` when the header is absent. It performs no validation.
2. `WorkspaceGuard` reads that key, loads the active workspace, and stores the row under `WorkspaceStoreKey`. A missing header and an unknown id both throw `WorkspaceNotFoundException` (404, `51600`).
3. `WorkspaceMemberGuard` then confirms the caller's membership and stores the `WorkspaceMember` row.

`POST /user/workspace/switch` takes the target id from the body, re-runs the same two checks the guards would have run (the workspace resolves and is active, the caller is a member of it), then records the choice on `user.lastWorkspaceId` and `lastWorkspaceChangedAt`. It does **not** change how a request is scoped: the client still has to send `x-workspace-id` on every workspace-scoped call.

Five user-scope routes deliberately carry no workspace header, because they act across workspaces or before membership exists: `list`, `create`, `switch`, `invite/claim`, and `join-request/create`.

## Guards and Decorators

Located at `src/modules/workspace/decorators`. For where these sit in the full protection stack, see [Authorization][ref-doc-authorization].

### `WorkspaceProtected()`

**Method decorator** that applies `WorkspaceGuard`. Place it directly above `@UserProtected()`.

Requires `x-workspace-id` to resolve to an existing, non-deleted workspace, through `WorkspaceService.validateWorkspaceGuard`, and stores the row under `WorkspaceStoreKey`. A missing header and an id that matches no active workspace both throw `WorkspaceNotFoundException` (404, `51600`) - the two cases are deliberately indistinguishable.

### `WorkspaceMemberProtected(...roles)`

**Method decorator**. Stack it above `@WorkspaceProtected()`. With no arguments it applies `WorkspaceMemberGuard` alone; with roles it applies `WorkspaceMemberGuard` **and** `WorkspaceRoleGuard`.

- `WorkspaceMemberGuard` confirms the user loaded by `UserGuard` has a `WorkspaceMember` row in the resolved workspace, and stores it under `WorkspaceMemberStoreKey`. No membership throws `WorkspaceMemberForbiddenException` (403, `51601`).
- `WorkspaceRoleGuard` enforces the declared roles against that stored membership. A mismatch throws `WorkspaceRoleForbiddenException` (403, `51602`).
- **The `owner` role always passes, whatever roles were declared.** Owner is never listed in a route's `allowedRoles`; folding it in would make every `@WorkspaceMemberProtected(admin)` route reject the owner.

### `WorkspaceCurrent()` / `WorkspaceMemberCurrent()`

**Parameter decorators** that read back the `Workspace` and `WorkspaceMember` the guards stored. They return `undefined` when the matching guard did not run.

### The `/admin` scope takes none of this

Admin routes reach the same resources through `@RoleProtected()` + `@PolicyProtected()` and take the workspace id from the **path**. They never read `x-workspace-id` and never carry a workspace guard.

## Personal Workspace

`UserOnboardingService.buildPersonalWorkspaceContexts` builds a workspace named from `workspace.personalNamePattern` (`{username}'s Workspace`) with a generated slug, and `UserOnboardingRepository.createWithWorkspace` writes it together with an `owner` membership inside the same transaction as the user.

`buildPersonalWorkspaceContexts` draws `workspace.slugMaxAttempts` (5) slug candidates per row and carries them on the context as `slugCandidates`. The create transaction runs with the first candidate; a unique collision on `slug` rolls the transaction back and the next candidate is tried, and running out of candidates raises `DatabaseUniqueValueGenerationFailedException` (500, `51800`), so the caller never sees a leaked Prisma error. Admin CSV import writes all its rows in one transaction through `createManyWithWorkspace`, which substitutes the same candidate index into every personal row of the batch and retries the whole batch, up to the smallest candidate count in it.

| User-creation path | Personal workspace |
|---|---|
| Admin create | Always |
| Admin CSV import | Always, one per row |
| Self sign-up | Only when no `inviteToken` is supplied |
| Social sign-up | Only when no `inviteToken` is supplied |

**A sign-up that carries a valid invite token joins the inviting workspace instead and gets no personal workspace.** That is the point of the invite: the new user lands where they were invited.

All paths set `user.lastWorkspaceId` and `lastWorkspaceChangedAt` to the resolved workspace.

## Endpoints

Global prefix `/api` and version prefix `v1` apply as elsewhere. The controller path is `/workspace` in all three scopes.

### User Scope

Mounted under `/user`. Every route carries `@FeatureFlagProtected('workspace')`.

| Method | Path | Header | Minimum role |
|---|---|---|---|
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

The `owner` role satisfies every `admin` and `member` requirement above.

### Public Scope

Mounted under `/public`. Unauthenticated, but still behind `@ApiKeyProtected()` and `@FeatureFlagProtected('workspace')`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/public/workspace/invite/:inviteToken/preview` | Shows workspace name, inviter name, offered role, and expiry for a pending invite. Nothing else |
| `GET` | `/public/workspace/preview/:slug` | Shows `id`, `name`, `slug`, `description`, and the `createdAt` / `updatedAt` / `deletedAt` timestamps of a **public** workspace. The `createdBy` / `updatedBy` / `deletedBy` audit columns are excluded, so the preview never names who runs it |

Neither preview answers `forbidden` for a resource that exists but is not eligible, so nothing can be probed: the slug preview collapses "private" and "unknown" into `notFound` (404, `51600`), and the invite preview collapses an unknown, expired, non-pending, or dead-workspace token into `inviteInvalid` (400, `51603`).

### Admin Scope

Mounted under `/admin`. Gated by `@RoleProtected(EnumRoleType.admin)` + `@PolicyProtected({ subject: workspace, action: [read] })`. **Not feature-flagged**, does not read `x-workspace-id`, read-only.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/workspace/list` | All workspaces including soft-deleted. Optional `isPublic` filter |
| `GET` | `/admin/workspace/get/:workspaceId` | Any workspace by id, with no active filter |
| `GET` | `/admin/workspace/get/:workspaceId/members` | Members of any workspace |

## Roles and Ownership

| Role | May |
|---|---|
| `member` | Read the workspace, list members, leave |
| `admin` | Everything a `member` may, plus update the workspace, manage members, and manage invites and join requests |
| `owner` | Everything, plus transfer ownership and soft-delete the workspace |

**`owner` short-circuits the role guard.** It is never listed in a route's allowed roles; folding it in would make every `admin`-gated route reject the owner.

**Peer rules** throw `WorkspaceMemberPeerForbiddenException` (403, `51608`). `assertPeerActionAllowed`, called on member role update and member removal, covers:

- the target is an `owner`, or
- the actor is an `admin` and the target is an `admin`.

`removeMember` adds one check of its own, ahead of that call: the actor targets themselves. Use leave instead.

**Transfer ownership** demotes the actor to `admin` and promotes the target to `owner` in one transaction. Transferring to yourself throws `WorkspaceSelfTransferException` (400, `51619`); a non-member target throws `WorkspaceMemberNotFoundException` (404, `51606`).

**Leave** hard-deletes the caller's membership. The last remaining `owner` cannot leave: `WorkspaceLastOwnerException` (400, `51607`). Transfer ownership first.

**Workspace cap.** `workspace.maxWorkspacesPerUser` (10) counts memberships with role `owner` on non-deleted workspaces, and is enforced **only in `POST /user/workspace/create`**, throwing `WorkspaceCapReachedException` (400, `51604`). Personal workspaces created during user creation, invite claims, and join-request acceptance do not consult the cap.

## Invites

An invite is addressed to an email, not to a user, so it works whether or not that address already has an account.

**Create.** `POST /user/workspace/invite/create` requires `admin`. It generates a random token, stores only its SHA-256 hash, and mints a `WIN-` prefixed reference. `projectId` and `projectRole` must be supplied together or not at all (`WorkspaceInviteRoleRequiredException`, 400, `51611`), and the project must belong to this workspace (`WorkspaceInviteProjectMismatchException`, 400, `51610`). A second pending invite to the same address in the same workspace throws `WorkspaceInviteDuplicateException` (400, `51609`).

**Expiry** comes from the request's `expiryDuration` (`EnumWorkspaceInviteExpiry`), defaulting to `workspace.invite.expiredInDays` (7).

**Delivery.** `createInviteTokenData` mints two links from the one plain token: a claim link from `workspace.invite.linkPattern` (`{homeUrl}/workspace/invites/{token}`) and a sign-up link from `workspace.invite.signUpLinkPattern` (`{homeUrl}/sign-up?inviteToken={token}`). `sendInviteNotification` looks the invited address up among active users and picks one of them: an address that already has a User row is sent the claim link, AES-encrypted with that user's `userId`, through the `workspaceInvite` notification process; an address with no account is sent the sign-up link, AES-encrypted with the invite `reference`, through `workspaceInviteUnregistered`. The two processes share one SES template.

**Resend** rotates the token, reference, and expiry, then sends again. Its body is optional and carries `expiryDuration` alone (`WorkspaceInviteResendRequestSchema`, a `.pick()` of the create schema); omitting it falls back to `workspace.invite.expiredInDays` (7) rather than to the duration the original invite was created with. Only a `pending` invite may be resent or revoked, otherwise `WorkspaceInviteAlreadyProcessedException` (400, `51613`).

**Claim.** `POST /user/workspace/invite/claim` is for an already-authenticated user. The token must hash to a `pending`, unexpired invite on an active workspace, and the invite email must match the caller's email (case-insensitive). Anything else, including an existing membership, collapses into `WorkspaceInviteInvalidException` (400, `51603`). On success one transaction creates the membership with `invite.workspaceRole`, marks the invite `accepted` with `acceptedAt` / `acceptedByUserId`, sets `user.lastWorkspaceId` and `lastWorkspaceChangedAt` to the joined workspace, creates the project membership when the invite carried one, and writes a `workspaceInviteAccepted` activity log.

A user who has no account yet redeems the invite through sign-up instead, by passing `inviteToken`. See [Personal Workspace](#personal-workspace).

**Expiry sweep.** `WorkspaceProcessorService.onModuleInit` calls `WorkspaceQueue.scheduleInviteExpirySweep`, which registers the recurring BullMQ job through `upsertJobScheduler` on the `workspace` queue, using the cron in `workspace.invite.expirySweepCron` (`0 0 * * *`) in the app timezone and at `low` priority. The scheduler is registered with `immediately: true`, so a sweep also runs at boot rather than waiting for the first cron tick. The job flips every `pending` invite past its `expiredAt` to `expired`.

## Join Requests

A user asks to join a workspace they can see; an admin decides.

- Only a workspace with `isPublic: true` accepts requests. A private one throws `WorkspaceNotPublicException` (400, `51614`).
- Already being a member throws `WorkspaceJoinRequestAlreadyMemberException` (400, `51615`); a second pending request throws `WorkspaceJoinRequestDuplicateException` (400, `51616`).
- On create, every reviewer (`owner` and `admin`) is notified. Each reviewer's review link is encrypted with **that reviewer's** user id, so the links are not interchangeable.
- **Accept always creates a `member` membership.** The role is not configurable on this path. The membership creation, the status flip to `accepted` with `reviewedByUserId` / `reviewedAt`, and the activity log all run in one transaction.
- Accept does **not** point the requester's `lastWorkspaceId` at the workspace they just joined, unlike an invite claim. They still have to switch to it.
- Reject requires a `rejectReasonCode` from `EnumWorkspaceJoinRejectReason`.
- Both outcomes notify the requester after the transaction commits: `workspaceJoinAccepted` on accept, `workspaceJoinRejected` (carrying the reason code) on reject.
- Only a `pending` request may be accepted or rejected, otherwise `WorkspaceJoinRequestAlreadyProcessedException` (400, `51618`). An id that does not belong to the resolved workspace is `WorkspaceJoinRequestNotFoundException` (404, `51617`).

The `cancelled` status is written only by workspace soft-delete. A requester has no endpoint to withdraw their own request.

## Slug

- **Creation always generates the slug.** `WorkspaceCreateRequestDto` carries no slug field: `WorkspaceService.createWorkspace` draws `workspace.slugMaxAttempts` (5) candidates of `workspace.slugPrefix` plus random characters up to `slugMaxLength` and hands them to `WorkspaceRepository.createWithOwner`. Choosing a slug is what `PATCH /user/workspace/update/slug` is for.
- A slug sent to `update/slug` is validated by `WorkspaceService.assertSlugAllowed` against `workspace.slugRegex` and `workspace.slugMaxLength`, throwing `WorkspaceSlugInvalidException` (400, `51620`), then checked against `WorkspaceRepository.existsBySlug`, which answers `WorkspaceSlugAlreadyExistsException` (400, `51605`) with no retry.
- Uniqueness is **global**, matching `@@unique([slug])`.
- `existsBySlug` counts holders across **all** rows including soft-deleted ones: the unique index has no `deletedAt` component, so a soft-deleted workspace still holds its slug, and the check agrees with the index.
- `createWithOwner` walks its candidates and moves to the next one when the write raises a unique collision on `slug`, recognised by `DatabaseUtil.isUniqueCollision`. Any other error is rethrown untouched, and exhausting the candidates throws `DatabaseUniqueValueGenerationFailedException` (500, `51800`).
- The personal-workspace slug follows the same budget inside the onboarding transaction, ending in the same `DatabaseUniqueValueGenerationFailedException` (500, `51800`). See [Generated Unique Values][ref-doc-database-generated-unique-values].

## Soft Delete

`DELETE /user/workspace/delete` requires `owner`. One transaction:

1. Stamps `deletedAt` and `updatedBy` on the workspace.
2. Soft-deletes every still-active project in it.
3. Flips every `pending` invite to `expired`.
4. Flips every `pending` join request to `cancelled`.
5. Writes a `workspaceDeleted` activity log.

**Not cascaded:** `WorkspaceMember` rows stay as they are, and `user.lastWorkspaceId` is not cleared for members still pointing at the deleted workspace. The slug also stays occupied. There is no restore.

## Feature Flag Gating

Two layers, and they are not the same check.

**Route level.** `@FeatureFlagProtected('workspace')` sits on all 22 user-scope routes and both public-scope routes. Turning the `workspace` flag off closes that whole surface. Admin-scope routes are not flagged and stay reachable.

**Metadata level.** Two sub-keys on the same flag are asserted inside the service, at the point where they actually govern behaviour:

| Sub-key | Gates |
|---|---|
| `invitationAllowed` | invite list, create, resend, revoke, claim, public preview, and a sign-up that carries `inviteToken` |
| `joinRequestAllowed` | public workspace preview by slug, join request create, list, accept, reject |

Both default to `true` in the seed. Turning `invitationAllowed` off freezes the invite queue completely: an operator can no longer list, revoke, or redeem around existing invites until they expire.

A flag is never an authorization boundary. See [Feature Flag][ref-doc-feature-flag].

## Configuration

`src/configs/workspace.config.ts`:

```typescript
{
  headerName: 'x-workspace-id',
  storeKey: 'workspaceId',
  maxWorkspacesPerUser: 10,
  personalNamePattern: "{username}'s Workspace",
  slugPrefix: 'w-',
  slugRegex: /^[0-9a-zA-Z-]+$/,
  slugMaxLength: 30,
  slugMaxAttempts: 5,
  invite: {
    expiredInDays: 7,
    tokenLength: 100,
    referencePrefix: 'WIN',
    referenceRandomLength: 25,
    linkPattern: '{homeUrl}/workspace/invites/{token}',
    signUpLinkPattern: '{homeUrl}/sign-up?inviteToken={token}',
    expirySweepCron: '0 0 * * *'
  },
  joinRequest: {
    reviewLinkPattern: '{homeUrl}/workspace/join-requests/{joinRequestId}'
  }
}
```

Each link key is a full URL template. `{homeUrl}` is filled from `home.url`, so one host value serves all three.

## Status Codes

| Member | statusCode | httpStatus |
|---|---|---|
| `notFound` | `51600` | 404 |
| `memberForbidden` | `51601` | 403 |
| `roleForbidden` | `51602` | 403 |
| `inviteInvalid` | `51603` | 400 |
| `capReached` | `51604` | 400 |
| `slugAlreadyExists` | `51605` | 400 |
| `memberNotFound` | `51606` | 404 |
| `lastOwner` | `51607` | 400 |
| `memberPeerForbidden` | `51608` | 403 |
| `inviteDuplicate` | `51609` | 400 |
| `inviteProjectMismatch` | `51610` | 400 |
| `inviteRoleRequired` | `51611` | 400 |
| `inviteNotFound` | `51612` | 404 |
| `inviteAlreadyProcessed` | `51613` | 400 |
| `notPublic` | `51614` | 400 |
| `joinRequestAlreadyMember` | `51615` | 400 |
| `joinRequestDuplicate` | `51616` | 400 |
| `joinRequestNotFound` | `51617` | 404 |
| `joinRequestAlreadyProcessed` | `51618` | 400 |
| `selfTransfer` | `51619` | 400 |
| `slugInvalid` | `51620` | 400 |

Full catalog: [Status Codes][ref-doc-status-codes].


## Contribution

Special thanks to [Gzerox][ref-contributor-gzerox] for main contributor for this feature.


<!-- REFERENCES -->

[ref-doc-project]: project.md
[ref-doc-authorization]: authorization.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-queue]: queue.md
[ref-doc-status-codes]: status-codes.md
[ref-doc-database-generated-unique-values]: database.md#generated-unique-values

[ref-contributor-gzerox]: https://github.com/Gzerox
