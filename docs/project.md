# Project Documentation

This documentation explains the features and usage of the **Project Module**: Located at `src/modules/project`

## Overview

A project is a unit of work inside a workspace. Every project belongs to exactly one workspace, and every project route is reached through that workspace: the caller sends `x-workspace-id` to select the workspace and carries `:projectId` in the path to select the project. **There is no project header.**

Projects carry their own membership with three roles (`admin`, `member`, `viewer`), independent of the caller's workspace role, with one deliberate exception: a workspace `owner` reaches every project in the workspace without holding a `ProjectMember` row.

## Related Documents

- [Workspace][ref-doc-workspace] - The workspace that scopes every project
- [Authorization][ref-doc-authorization] - Where the project guards sit in the full protection stack
- [Feature Flag][ref-doc-feature-flag] - The `workspace` flag that gates the whole user-scope surface
- [Status Codes][ref-doc-status-codes] - The full `51700`-`51707` block
- [Pagination][ref-doc-pagination] - Cursor pagination on the `/user` list endpoints, offset on `/admin/project/list`

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
- [Contribution](#contribution)

## Data Model

### `Project` (`Projects`)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | ObjectId |
| `workspaceId` | `String` | ObjectId, relation to `Workspace` |
| `name` | `String` | |
| `slug` | `String` | Unique per workspace |
| `description` | `String?` | |
| `createdAt` / `createdBy` | `DateTime` / `String?` | |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` | |
| `deletedAt` | `DateTime?` | Soft-delete marker. There is no `deletedBy` on this model |

- `@@unique([workspaceId, slug])`
- `@@index([workspaceId, deletedAt, createdAt desc, id desc])`

### `ProjectMember` (`ProjectMembers`)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | ObjectId |
| `projectId` | `String` | ObjectId |
| `userId` | `String` | ObjectId |
| `role` | `EnumProjectMemberRole` | Required, no default |
| `joinedAt` | `DateTime` | Defaults to now |
| `createdAt` / `createdBy` | `DateTime` / `String?` | |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` | |

- `@@unique([projectId, userId])`, `@@index([userId])`, `@@index([projectId, role, createdAt desc, id desc])`, `@@index([projectId, createdAt desc, id desc])`, `@@index([projectId, joinedAt, id])`
- No soft-delete columns: removing a member is a hard delete of the row.

`EnumProjectMemberRole`: `admin`, `member`, `viewer`.

**Active filter.** `ProjectActiveFilter` (`src/modules/project/constants/project.constant.ts`) is `[{ deletedAt: null }, { deletedAt: { isSet: false } }]`. Prisma's MongoDB connector compiles a bare `{ deletedAt: null }` into a query that also requires the field to be present, which silently drops rows written before the field existed. Every active-only read uses the `OR` form instead.

## Endpoints

Global prefix `/api` and version prefix `v1` apply as elsewhere. The controller path is `/project` in both scopes.

### User Scope

Mounted under `/user`. **Every route below requires the `x-workspace-id` header** and carries `@FeatureFlagProtected('workspace')`.

| Method | Path | Who may call it |
|---|---|---|
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

Note the path shape on the member routes: `:projectId` leads the target segment, because the target is an attribute of that project.

### Admin Scope

Mounted under `/admin`. Gated by `@RoleProtected(EnumRoleType.admin)` + `@PolicyAbilityProtected({ subject: project, action: [read] })`. These routes are **not** feature-flagged, do not read `x-workspace-id`, and are read-only.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/project/list` | Cross-workspace paginated list. Optional `workspaceId` query param narrows it. Includes soft-deleted projects |
| `GET` | `/admin/project/get/:projectId` | Any project by id, with no workspace scope and no active filter, so a soft-deleted project is still returned |

## Access Control

The guards run in this order, first to last: `ApiKeyGuard` → JWT → `FeatureFlagGuard` → `UserGuard` → `WorkspaceGuard` → `WorkspaceMemberGuard` → `ProjectGuard` → `ProjectRoleGuard` (or `ProjectMemberGuard`) → `TermPolicyGuard`. Each guard reads what the previous one stored and never re-fetches.

- **`ProjectGuard`** reads the `projectId` route param and the workspace `WorkspaceGuard` resolved, then loads the project **constrained to that workspace and to non-deleted rows**. A missing param, a soft-deleted project, and a project belonging to a different workspace all collapse into the same `ProjectNotFoundException` (404, `51700`). Cross-workspace probing therefore cannot distinguish "not yours" from "does not exist".
- **`@ProjectMemberProtected()`** with no arguments demands a real `ProjectMember` row and has no owner bypass.
- **`@ProjectMemberProtected(...roles)`** enforces the roles and **lets a workspace `owner` through without a `ProjectMember` row**. That bypass is recorded under `ProjectWorkspaceOwnerStoreKey`, which the peer rules below read.

A workspace `admin` does **not** inherit project access. Only `owner` bypasses. Workspace `admin` does, however, gate project `create` and `delete`, which are workspace-level operations rather than project-level ones.

### Guards and Decorators

Located at `src/modules/project/decorators`. For where these sit in the full protection stack, see [Authorization][ref-doc-authorization].

#### `ProjectProtected()`

**Method decorator** that applies `ProjectGuard`. It requires `@WorkspaceProtected()` below it - a project is always reached through its workspace.

Reads the `projectId` **route parameter** (there is no project header) and resolves it through `ProjectService.validateProjectGuard`, constrained to the workspace `WorkspaceGuard` resolved. The result is stored under `ProjectStoreKey`. No active workspace throws `WorkspaceNotFoundException` (404, `51600`).

#### `ProjectMemberProtected(...roles)`

**Method decorator**. Stack it above `@ProjectProtected()`. The two argument forms bind **different** guards, and the difference is the point:

- **No arguments** applies `ProjectMemberGuard` alone, storing the row under `ProjectMemberStoreKey`. No row throws `ProjectMemberForbiddenException` (403, `51701`). This is the form used by `member leave`, which has nothing to remove without a row.
- **With roles** applies `ProjectRoleGuard` alone. A missing workspace membership, a missing project membership, or a role outside the list throws `ProjectRoleForbiddenException` (403, `51702`).

Because the role form does not bind `ProjectMemberGuard`, `@ProjectMemberCurrent()` is `undefined` on a role-gated route.

#### `ProjectCurrent()` / `ProjectMemberCurrent()`

**Parameter decorators** that read back the `Project` and `ProjectMember` the guards stored.

### The `/admin` scope takes none of this

Admin routes carry no project or workspace guard. They take the project id from the path and are gated by `@RoleProtected()` + `@PolicyAbilityProtected()` instead.

## Slug

- A client may supply a slug on create and on `PATCH /update/:projectId/slug`. It is validated by `ProjectService.assertSlugAllowed`: over `project.slugMaxLength`, or failing `project.slugPattern`, throws `ProjectSlugInvalidException` (400, `51707`).
- When no slug is supplied on create, `ProjectRepository.createWithSlug` generates one as `project.slugPrefix` plus random characters up to `slugMaxLength`. Generated slugs are not run through `assertSlugAllowed`.
- **Uniqueness is per workspace**, matching the `@@unique([workspaceId, slug])` index.
- The existence pre-check (`existsBySlugInWorkspace`) deliberately has **no active filter**. The unique index has no `deletedAt` component, so a soft-deleted project still holds its slug; the pre-check and the index agree rather than disagree.
- A client-supplied collision throws `ProjectSlugAlreadyExistsException` (400, `51706`). A generated collision is retried up to `project.slugMaxAttempts` (5) times, and only when the Prisma error is `P2002`; any other error is rethrown untouched, and exhausting the attempts throws `DatabaseUniqueValueGenerationFailedException` (500, `51800`). See [Generated Unique Values][ref-doc-database-generated-unique-values].

## Membership

A project member must already be a workspace member. `assignMember` resolves the target's `WorkspaceMember` row first and throws `WorkspaceMemberNotFoundException` (404, `51606`) when there is none. That check runs at assign time only.

| Operation | Rules |
|---|---|
| Assign | Peer rule on the requested role. Throws `ProjectMemberAlreadyAssignedException` (400, `51705`) when the user already belongs |
| Update role | Peer rule on **both** the target's current role and the new role. Unknown member throws `ProjectMemberNotFoundException` (404, `51704`) |
| Remove | Peer rule on the target's role. Removing yourself throws `ProjectMemberPeerForbiddenException` (403, `51703`); use leave instead. The row is hard-deleted |
| Leave | No peer or role check. The caller's own row is hard-deleted |

**Peer rule.** `assertProjectMemberPeerAllowed` throws `ProjectMemberPeerForbiddenException` (403, `51703`) when the actor is not the workspace owner and any role involved in the operation is `admin`. A project `admin` can therefore manage `member` and `viewer` rows, but can neither create another `admin` nor act on an existing one. Only the workspace owner can.

**There is no last-admin protection on leave.** Nothing counts remaining admins, so the last project `admin` can leave and the project can be left with no members at all. The workspace owner still reaches it through the bypass.

Every membership change writes an activity log entry (`projectMemberAssigned`, `projectMemberRoleUpdated`, `projectMemberRemoved`, `projectMemberLeft`).

## Soft Delete

`ProjectRepository.softDelete` runs one transaction that stamps `deletedAt` and `updatedBy` on the project and writes a `projectDeleted` activity log. **It cascades to nothing**: `ProjectMember` rows and any invite referencing the project are left as they are, and the slug stays occupied.

After deletion the project disappears from `ProjectGuard` and from the user-scope list, but the admin routes still return it because they apply no active filter. There is no restore and no hard delete.

Deleting the **workspace** soft-deletes its still-active projects in the same transaction. See [Workspace][ref-doc-workspace].

## Configuration

`src/configs/project.config.ts`:

```typescript
{
  slugPrefix: 'p-',
  slugPattern: /^[0-9a-zA-Z-]+$/,
  slugMaxLength: 30,
  slugMaxAttempts: 5
}
```

`slugPattern` and `slugMaxLength` are read by `ProjectService` for validation; `slugPrefix`, `slugMaxLength`, and `slugMaxAttempts` are read by `ProjectRepository` for generation and retry.

## Status Codes

| Member | statusCode | httpStatus | Meaning |
|---|---|---|---|
| `notFound` | `51700` | 404 | Unknown, soft-deleted, or out-of-workspace project |
| `memberForbidden` | `51701` | 403 | Caller holds no `ProjectMember` row |
| `roleForbidden` | `51702` | 403 | Caller's project role is not allowed here |
| `memberPeerForbidden` | `51703` | 403 | Operation involves an `admin` and the actor is not the workspace owner, or self-removal |
| `memberNotFound` | `51704` | 404 | Target member row does not exist in this project |
| `memberAlreadyAssigned` | `51705` | 400 | User already belongs to the project |
| `slugAlreadyExists` | `51706` | 400 | Slug already taken in this workspace |
| `slugInvalid` | `51707` | 400 | Slug fails the pattern or the length cap |

Full catalog: [Status Codes][ref-doc-status-codes].


## Contribution

Special thanks to [Gzerox][ref-contributor-gzerox] for main contributor for this feature.


<!-- REFERENCES -->

[ref-doc-workspace]: workspace.md
[ref-doc-authorization]: authorization.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-status-codes]: status-codes.md
[ref-doc-pagination]: pagination.md
[ref-doc-database-generated-unique-values]: database.md#generated-unique-values

[ref-contributor-gzerox]: https://github.com/Gzerox
