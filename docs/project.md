# Project Documentation

Project lives in `src/modules/project`.

## Overview

A project is a unit of work inside a workspace.

- Every project belongs to exactly one workspace.
- Every project route is reached through that workspace: the caller sends `x-workspace-id` to select the workspace and carries `:projectId` in the path to select the project.
- **There is no project header.**

Projects carry their own membership with three roles, independent of the caller's workspace role:

- `admin`
- `member`
- `viewer`

One exception: a workspace `owner` reaches every project in the workspace without holding a `ProjectMember` row.

## Related Documents

- [Workspace][ref-doc-workspace]: The workspace that scopes every project
- [Authorization][ref-doc-authorization]: Where the project guards sit in the full protection stack
- [Feature Flag][ref-doc-feature-flag]: The `workspace` flag that gates the whole user-scope surface
- [Status Codes][ref-doc-status-codes]: The full `51700`-`51709` block
- [Pagination][ref-doc-pagination]: Cursor pagination on the `/user` list endpoints, offset on `/admin/project/list`

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Data Model](#data-model)
- [Endpoints](#endpoints)
    - [User Scope](#user-scope)
    - [Admin Scope](#admin-scope)
- [Access Control](#access-control)
    - [Guards and Decorators](#guards-and-decorators)
    - [The /admin scope takes none of this](#the-admin-scope-takes-none-of-this)
- [Slug](#slug)
- [Membership](#membership)
- [Soft Delete](#soft-delete)
- [Configuration](#configuration)
- [Status Codes](#status-codes)

## Data Model

### `Project` (`Projects`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | ObjectId |
| `workspaceId` | `String` | ObjectId, relation to `Workspace` |
| `name` | `String` |  |
| `slug` | `String` | Unique per workspace |
| `description` | `String?` |  |
| `createdAt` / `createdBy` | `DateTime` / `String?` |  |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` |  |
| `deletedAt` / `deletedBy` | `DateTime?` / `String?` | Soft-delete marker and the id of the user who deleted the project |

- `@@unique([workspaceId, slug])`
- `@@index([workspaceId, deletedAt, createdAt desc, id desc])`

`ProjectResponseSchema` declares every audit column, `deletedBy` included, so each project row in a response carries it.

- The user routes read live rows only, so `deletedBy` is `null` there.
- The admin routes apply no live filter, so a soft-deleted project shows who deleted it.

### `ProjectMember` (`ProjectMembers`)

| Field                     | Type                    | Notes                |
| ------------------------- | ----------------------- | -------------------- |
| `id`                      | `String`                | ObjectId             |
| `projectId`               | `String`                | ObjectId             |
| `userId`                  | `String`                | ObjectId             |
| `role`                    | `EnumProjectMemberRole` | Required, no default |
| `joinedAt`                | `DateTime`              | Defaults to now      |
| `createdAt` / `createdBy` | `DateTime` / `String?`  |                      |
| `updatedAt` / `updatedBy` | `DateTime` / `String?`  |                      |

- `@@unique([projectId, userId])`
- `@@index([userId])`
- `@@index([projectId, role, createdAt desc, id desc])`
- `@@index([projectId, createdAt desc, id desc])`
- `@@index([projectId, joinedAt, id])`
- No soft-delete columns: removing a member is a hard delete of the row.

`EnumProjectMemberRole`: `admin`, `member`, `viewer`.

**Active filter.** `ProjectActiveFilter` (`src/modules/project/constants/project.constant.ts`) is `[{ deletedAt: null }, { deletedAt: { isSet: false } }]`.

- Prisma's MongoDB connector compiles a bare `{ deletedAt: null }` into a query that also requires the field to be present, which silently drops rows written before the field existed.
- Every active-only read uses the `OR` form.

## Endpoints

- Global prefix `/api` and version prefix `v1` apply as elsewhere.
- The controller path is `/project` in both scopes.

### User Scope

- Mounted under `/user`.
- **Every route below requires the `x-workspace-id` header** and carries `@FeatureFlagProtected('workspace')`.

| Method | Path | Who may call it |
| --- | --- | --- |
| `GET` | `/user/project/list` | Any workspace member. The workspace owner sees every project; everyone else sees only projects they belong to |
| `POST` | `/user/project/create` | Workspace `admin` (and `owner`) |
| `GET` | `/user/project/get/:projectId` | Project `admin`, `member`, or `viewer` (or workspace `owner`) |
| `PUT` | `/user/project/update/:projectId` | Project `admin` (or workspace `owner`) |
| `PATCH` | `/user/project/update/:projectId/slug` | Project `admin` (or workspace `owner`) |
| `DELETE` | `/user/project/delete/:projectId` | Workspace `admin` (and `owner`). Project membership is **not** required |
| `GET` | `/user/project/member/:projectId/list` | Project `admin`, `member`, or `viewer` (or workspace `owner`) |
| `POST` | `/user/project/member/:projectId/assign` | Project `admin` (or workspace `owner`) |
| `PATCH` | `/user/project/member/:projectId/:projectMemberId/role/update` | Project `admin` (or workspace `owner`) |
| `DELETE` | `/user/project/member/:projectId/:projectMemberId/remove` | Project `admin` (or workspace `owner`) |
| `POST` | `/user/project/member/:projectId/leave` | Any project member. A real `ProjectMember` row is required, so the workspace-owner bypass does not apply |

- On the member routes, `:projectId` leads the target segment, because the target is an attribute of that project.
- `PUT /user/project/update/:projectId` takes `name` and `description` as optional fields. A field left out keeps its stored value.
- The list routes take `search` and `orderBy` query params. `orderBy` is `field:direction`, repeatable, and each route's request schema validates it against that route's allow-list, so an unlisted field answers a validation error (422, `50300`). The allow-list also rides in the response metadata as `availableOrderBy`.

### Admin Scope

- Mounted under `/admin`.
- Gated by `@RoleProtected(EnumRoleType.admin)` + `@PolicyProtected({ subject: project, action: [read] })`.

These routes are:

- **not** feature-flagged
- read-only
- blind to `x-workspace-id`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/project/list` | Cross-workspace paginated list. Optional `workspaceId` query param narrows it. Includes soft-deleted projects |
| `GET` | `/admin/project/get/:projectId` | Any project by id, with no workspace scope and no active filter, so a soft-deleted project is still returned |

- `/admin/project/list` takes `search` and `orderBy` query params.
- `ProjectAdminListRequestSchema` validates `orderBy` against `ProjectDefaultAvailableOrderBy` the same way the user lists do, so an unlisted field answers a validation error (422, `50300`).
- The allow-list rides in the response metadata as `availableOrderBy`.

## Access Control

Decorators apply bottom-up, so a decorator written lower in the source runs earlier. "Below" and "above" on this page mean position in the source, and the guards run in this order, first to last:

1. `ApiKeyXApiKeyGuard`
2. JWT
3. `FeatureFlagGuard`
4. `UserGuard`
5. `WorkspaceGuard`
6. `WorkspaceMemberGuard`
7. `ProjectGuard`
8. `ProjectRoleGuard` (or `ProjectMemberGuard`)
9. `TermPolicyGuard`

Each guard reads what the guards that run earlier stored and never re-fetches. When a store it needs is empty, it throws the guard-only exception of the subject that store belongs to:

| Empty store      | Exception                              | Status       |
| ---------------- | -------------------------------------- | ------------ |
| user             | `UserGuardMissingException`            | 401, `51027` |
| workspace        | `WorkspaceGuardMissingException`       | 403, `51622` |
| workspace member | `WorkspaceMemberGuardMissingException` | 403, `51623` |
| project          | `ProjectGuardMissingException`         | 403, `51708` |
| project member   | `ProjectMemberGuardMissingException`   | 403, `51709` |

- The `*Current` param decorators throw the same exceptions when they read an empty store.
- No check for a missing or misordered guard runs when a route is decorated. A route stacked in the wrong order boots and answers one of these on every request.
- A decorator argument check still throws when the route is decorated: `RoleProtectedEmptyException`, `PolicyProtectedEmptyException`, and `PolicyProtectedActionEmptyException` fail the boot. `@ProjectMemberProtected(...roles)` and `@ProjectProtected()` take no argument that can be empty.

The guards:

- **`ProjectGuard`** reads the `projectId` route param and the workspace `WorkspaceGuard` resolved, then loads the project **constrained to that workspace and to non-deleted rows**.
    - A malformed id, a soft-deleted project, and a project belonging to a different workspace all collapse into the same `ProjectNotFoundException` (404, `51700`).
    - Cross-workspace probing therefore cannot distinguish "not yours" from "does not exist".
    - A route with no `:projectId` path param answers `RequestContextMissingException` (500, `50304`).
- **`@ProjectMemberProtected()`** with no arguments demands a real `ProjectMember` row and has no owner bypass.
- **`@ProjectMemberProtected(...roles)`** enforces the roles and **lets a workspace `owner` through without a `ProjectMember` row**. That bypass is recorded under `ProjectWorkspaceOwnerStoreKey`, which the peer rules below read.

Workspace roles and project access:

- A workspace `admin` does **not** inherit project access. Only `owner` bypasses.
- Workspace `admin` does gate project `create` and `delete`, which are workspace-level operations rather than project-level ones.

### Guards and Decorators

- Located at `src/modules/project/decorators`.
- For where these sit in the full protection stack, see [Authorization][ref-doc-authorization].

#### `ProjectProtected()`

**Method decorator** that applies `ProjectGuard`. A project is always reached through its workspace, so `ProjectGuard` reads the workspace store that `WorkspaceGuard` writes.

- `@WorkspaceProtected()` is written below it, so it runs earlier.
- Nothing checks that order when the route is decorated. Without the workspace guard the project guard answers `WorkspaceGuardMissingException` on every request.

- It reads the `projectId` **route parameter** (there is no project header).
- It resolves it through `ProjectDomain.validateProjectGuard`, constrained to the workspace `WorkspaceGuard` resolved.
- It stores the result under `ProjectStoreKey`.
- An empty workspace store throws `WorkspaceGuardMissingException` (403, `51622`).

#### `ProjectMemberProtected(...roles)`

**Method decorator**. Stack it above `@ProjectProtected()`. The two argument forms bind **different** guards, and the difference is the point:

- **No arguments** applies `ProjectMemberGuard` alone, storing the row under `ProjectMemberStoreKey`.
    - An empty user store throws `UserGuardMissingException` (401, `51027`).
    - An empty project store throws `ProjectGuardMissingException` (403, `51708`).
    - No row throws `ProjectMemberForbiddenException` (403, `51701`).
    - This is the form used by `member leave`, which has nothing to remove without a row.
- **With roles** applies `ProjectRoleGuard` alone, which throws:
    - `ProjectGuardMissingException` (403, `51708`) for an empty project store
    - `WorkspaceMemberGuardMissingException` (403, `51623`) for an empty workspace member store
    - `ProjectMemberForbiddenException` (403, `51701`) for a missing project membership
    - `ProjectRoleForbiddenException` (403, `51702`) for a role outside the list

Because the role form does not bind `ProjectMemberGuard`:

- Nothing is stored under `ProjectMemberStoreKey` on a role-gated route.
- `@ProjectMemberCurrent()` throws there for every caller, the workspace owner included.
- That decorator belongs only on a route using the role-less form.

#### `ProjectCurrent()` / `ProjectMemberCurrent()`

**Parameter decorators** that read back the `Project` and `ProjectMember` the guards stored:

- Each takes an optional field name typed against its model.
- Without a field name, each returns the whole row.
- Both return a non-null value.

Per decorator:

- `ProjectCurrent()` on a route without `@ProjectProtected()` answers `ProjectGuardMissingException` (403, `51708`).
- A field name that holds `null` answers `RequestContextMissingException` (500, `50304`) on either decorator.
- `ProjectMemberCurrent()` is valid only on a route carrying the role-less `@ProjectMemberProtected()`, the form that binds `ProjectMemberGuard`.
    - On the role-less form the guard has stored the row. A caller with no row never reaches the handler: the guard throws `ProjectMemberForbiddenException` (403, `51701`). `member leave` passes the stored row to `ProjectMemberDomain.leaveProject`.
    - A role-gated route stores no member row, so the read answers `ProjectMemberGuardMissingException` (403, `51709`) there. No other guard throws that exception.

The store readers: [Security and Middleware][ref-doc-security-and-middleware].

### The `/admin` scope takes none of this

- Admin routes carry no project or workspace guard.
- They take the project id from the path and are gated by `@RoleProtected()` + `@PolicyProtected()` instead.

## Slug

- **Creation always generates the slug.**
    - `ProjectCreateRequestDto` carries no slug field.
    - `ProjectDomain.createProject` draws `project.slugMaxAttempts` (5) candidates of `project.slugPrefix` plus random characters up to `slugMaxLength`, and passes them to `ProjectRepository.create`, which walks them.
    - Choosing a slug is what `PATCH /user/project/update/:projectId/slug` is for, and only that path runs `assertSlugAllowed`.
- `ProjectDomain.assertSlugAllowed` validates a slug sent to `update/:projectId/slug`.
    - A slug over `project.slugMaxLength`, or failing `project.slugRegex`, throws `ProjectSlugInvalidException` (400, `51707`).
    - A slug already held in the workspace throws `ProjectSlugAlreadyExistsException` (400, `51706`), with no retry.
- **Uniqueness is per workspace**, matching the `@@unique([workspaceId, slug])` index.
- `existsBySlugInWorkspace`, the check behind slug update, counts holders other than the project itself across **all** rows in the workspace, soft-deleted ones included.
    - The unique index has no `deletedAt` component, so a soft-deleted project still holds its slug.
    - The check therefore agrees with the index.
- `createProject` prepares `projectCreated`, then calls `ProjectRepository.create(workspaceId, dto, slugCandidates)`.
    - The repository runs one `client.project.create` per candidate with no transaction.
    - A unique collision on `slug`, recognised by `DatabaseUtil.isUniqueCollision`, moves to the next candidate.
    - The activity log is staged once, after the create resolves, so a collision stages nothing.
    - Any other error is wrapped in `AppUnknownException`.
    - Exhausting the candidates throws `DatabaseUniqueValueGenerationFailedException` (409, `51800`).
    - See [Generated Unique Values][ref-doc-database-generated-unique-values].

## Membership

Every project member is already a workspace member.

- `ProjectMemberHttpService.assignMember` resolves the target's `WorkspaceMember` row through `WorkspaceMemberDomain.getOneByWorkspaceAndUser`.
- `ProjectMemberDomain.assignMember` applies the peer rule, then throws `WorkspaceMemberNotFoundException` (404, `51606`) when there is no row in the project's workspace.
- That check runs at assign time only.

| Operation | Rules |
| --- | --- |
| Assign | Peer rule on the requested role. Throws `ProjectMemberAlreadyAssignedException` (400, `51705`) when the user already belongs |
| Update role | Peer rule on **both** the target's current role and the new role. Unknown member throws `ProjectMemberNotFoundException` (404, `51704`) |
| Remove | Peer rule on the target's role. Removing yourself throws `ProjectMemberPeerForbiddenException` (403, `51703`); use leave instead. The row is hard-deleted |
| Leave | No peer or role check. The caller's own row is hard-deleted |

**Peer rule.** `assertProjectMemberPeerAllowed` throws `ProjectMemberPeerForbiddenException` (403, `51703`) when the actor is not the workspace owner and any role involved in the operation is `admin`.

- A project `admin` can therefore manage `member` and `viewer` rows.
- A project `admin` can neither create another `admin` nor act on an existing one.
- Only the workspace owner can.

**There is no last-admin protection on leave.**

- Nothing counts remaining admins, so the last project `admin` can leave.
- The project can be left with no members at all.
- The workspace owner still reaches it through the bypass.

Each membership change is a single write on `ProjectMemberRepository` (`create`, `updateRole`, `removeMember`) with no transaction.

Its activity rows are prepared before the write and staged after it.

- Assign, update role, and remove write an actor row for the caller carrying `targetUserId`.
- They also write a target row for the affected member carrying `actorUserId`, with `createdBy` set to the caller.

| Operation   | Actor row                  | Target row                        |
| ----------- | -------------------------- | --------------------------------- |
| Assign      | `projectMemberAssigned`    | `projectMemberAssignedByAdmin`    |
| Update role | `projectMemberRoleUpdated` | `projectMemberRoleUpdatedByAdmin` |
| Remove      | `projectMemberRemoved`     | `projectMemberRemovedByAdmin`     |
| Leave       | `projectMemberLeft`        | none                              |

- A caller who assigns themselves or updates their own role gets the actor row only.
- A removal always writes both rows, because removing yourself throws.
- Both rows of a pair carry the project's `workspaceId`.
- See [Activity Log][ref-doc-activity-log].

## Soft Delete

`ProjectDomain.softDeleteProject`:

1. Prepares `projectDeleted`.
2. Calls `ProjectRepository.softDelete`, which runs `client.project.softDelete` with no transaction.
    - It sets `deletedAt`.
    - It stamps `deletedBy` and `updatedBy` from the caller.
3. Stages the activity log.

**It cascades to nothing**: `ProjectMember` rows and any invite referencing the project are left as they are, and the slug stays occupied.

After deletion:

- The project disappears from `ProjectGuard` and from the user-scope list.
- The admin routes still return it because they apply no active filter.
- There is no restore and no hard delete.

Deleting the **workspace** soft-deletes its still-active projects in the same transaction:

- Each project gets the workspace's `deletedAt`.
- Each project's `deletedBy` is set to the caller.
- See [Workspace][ref-doc-workspace].

## Configuration

`src/configs/project.config.ts`:

```typescript
{
  slugPrefix: 'p-',
  slugRegex: /^[0-9a-zA-Z-]+$/,
  slugMaxLength: 30,
  slugMaxAttempts: 5
}
```

`ProjectDomain` reads all four keys:

- `slugRegex` and `slugMaxLength` for validation
- `slugPrefix`, `slugMaxLength`, and `slugMaxAttempts` when it draws the candidates `ProjectRepository.create` walks through

## Status Codes

| Member | statusCode | httpStatus | Meaning |
| --- | --- | --- | --- |
| `notFound` | `51700` | 404 | Unknown, soft-deleted, or out-of-workspace project |
| `memberForbidden` | `51701` | 403 | Caller holds no `ProjectMember` row |
| `roleForbidden` | `51702` | 403 | Caller's project role is not allowed here |
| `memberPeerForbidden` | `51703` | 403 | Operation involves an `admin` and the actor is not the workspace owner, or self-removal |
| `memberNotFound` | `51704` | 404 | Target member row does not exist in this project |
| `memberAlreadyAssigned` | `51705` | 400 | User already belongs to the project |
| `slugAlreadyExists` | `51706` | 400 | Slug already taken in this workspace |
| `slugInvalid` | `51707` | 400 | Slug fails the pattern or the length cap |
| `guardMissing` | `51708` | 403 | A guard or `@ProjectCurrent()` found the project store empty |
| `memberGuardMissing` | `51709` | 403 | A guard or `@ProjectMemberCurrent()` found the project member store empty |

Full catalog: [Status Codes][ref-doc-status-codes].

<!-- REFERENCES -->

[ref-doc-workspace]: workspace.md
[ref-doc-authorization]: authorization.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-status-codes]: status-codes.md
[ref-doc-pagination]: pagination.md
[ref-doc-database-generated-unique-values]: database.md#generated-unique-values
[ref-doc-activity-log]: activity-log.md
[ref-doc-security-and-middleware]: security-and-middleware.md
