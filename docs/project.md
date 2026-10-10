# Project Documentation

Project lives in `src/modules/project`.

## Overview

A project is a unit of work inside a workspace. Every project belongs to exactly one workspace, and every project route is reached through that workspace: the caller sends `x-workspace-id` to select the workspace and carries `:projectId` in the path to select the project. **There is no project header.**

Projects carry their own membership with three roles (rows of the shared `Role` model with scope `project`), independent of the caller's workspace role:

- `admin`
- `member`
- `viewer`

A caller's effective policies on a project route are the policies of the platform role, the workspace role, and the project role, composed in that order into one ability. A workspace `owner` holds explicit `project` and `projectMember` actions through its workspace role, so it reaches every project in the workspace without holding a `ProjectMember` row.

## Related Documents

- [Workspace][ref-doc-workspace] - The workspace that scopes every project
- [Authorization][ref-doc-authorization] - Where the project guards sit in the full protection stack
- [Feature Flag][ref-doc-feature-flag] - The `workspace` flag that gates the whole user-scope surface
- [Status Codes][ref-doc-status-codes] - The full `51700`-`51706` block
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

### `Project` (`projects`)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | UUIDv7, `@db.Uuid`, database-generated |
| `workspaceId` | `String` | `@db.Uuid`, relation to `Workspace` |
| `name` | `String` | |
| `slug` | `String` | Unique per workspace |
| `description` | `String?` | |
| `createdAt` / `createdBy` | `DateTime` / `String?` | |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` | |
| `deletedAt` / `deletedBy` | `DateTime?` / `String?` | Soft-delete marker and the id of the user who deleted the project |

- `@@unique([workspaceId, slug])`
- `@@index([workspaceId, deletedAt, createdAt desc, id desc])`

`ProjectResponseSchema` declares every audit column, `deletedBy` included, so each project row in a response carries it. The user routes read live rows only, so `deletedBy` is `null` there; the admin routes apply no live filter, so a soft-deleted project shows who deleted it.

### `ProjectMember` (`project_members`)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | UUIDv7, `@db.Uuid`, database-generated |
| `projectId` | `String` | `@db.Uuid` |
| `userId` | `String` | `@db.Uuid` |
| `roleId` | `String` | `@db.Uuid`, foreign key to a `Role` of scope `project`. Required |
| `joinedAt` | `DateTime` | Defaults to now |
| `createdAt` / `createdBy` | `DateTime` / `String?` | |
| `updatedAt` / `updatedBy` | `DateTime` / `String?` | |

- `@@unique([projectId, userId])`, `@@index([userId])`, `@@index([projectId, roleId, joinedAt, id])`, `@@index([projectId, joinedAt, id])`
- No soft-delete columns: removing a member is a hard delete of the row.

The project role keys are `admin`, `member`, `viewer` (`EnumRoleProjectKey`). Member responses return `role: { id, scope, key, name }` (`RoleRefResponseSchema`). Assigning a role of another scope is rejected with `RoleScopeMismatchException` (400, `50501`).

**Active filter.** `ProjectActiveFilter` (`src/modules/project/constants/project.constant.ts`) is `{ deletedAt: null }`. Every active-only read spreads it into its `where`.

## Endpoints

Global prefix `/api` and version prefix `v1` apply as elsewhere. The controller path is `/project` in both scopes.

### User Scope

Mounted under `/user`. **Every route below requires the `x-workspace-id` header** and carries `@FeatureFlagProtected('workspace')`.

| Method | Path | Gate |
|---|---|---|
| `GET` | `/user/project/list` | Any workspace member whose ability holds `project:[read]` (the route builds the workspace ability and enforces no policy decorator). The policy predicate alone decides the result: the `owner` and `admin` see every project in the workspace, a `member` sees only the projects they are assigned to, and a caller with no `project:[read]` rule receives `403` |
| `GET` | `/user/project/:projectId/permissions` | Any workspace member. A project membership is optional: the route reads the combined ability and enforces no policy. Returns the caller's effective actions on `project` and `projectMember`, evaluated against the loaded project, and an empty list when nothing is granted |
| `POST` | `/user/project/create` | `project:[create]`, a subject-type check (workspace `admin` and `owner`) |
| `GET` | `/user/project/get/:projectId` | `project:[read]` from the project role or the workspace role |
| `PUT` | `/user/project/update/:projectId` | `project:[update]` from the project role (`admin`) or the workspace role (`owner`) |
| `PATCH` | `/user/project/update/:projectId/slug` | `project:[update]`, as above |
| `DELETE` | `/user/project/delete/:projectId` | `project:[delete]` (workspace `admin` and `owner`). The route carries no project member guard, so project membership is not consulted |
| `GET` | `/user/project/member/:projectId/list` | `project:[read]`, as for `get` |
| `POST` | `/user/project/member/:projectId/assign` | `projectMember:[create]` (project `admin`, workspace `owner`) |
| `PATCH` | `/user/project/member/:projectId/:projectMemberId/role/update` | `projectMember:[update]` |
| `DELETE` | `/user/project/member/:projectId/:projectMemberId/remove` | `projectMember:[delete]` |
| `POST` | `/user/project/member/:projectId/leave` | Any project member. A real `ProjectMember` row is required |

Note the path shape on the member routes: `:projectId` leads the target segment, because the target is an attribute of that project.

### Admin Scope

Mounted under `/admin`. Gated by `@PlatformPolicyProtected({ subject: Project, action: [read] })` against the caller's platform role. These routes are **not** feature-flagged, do not read `x-workspace-id`, and are read-only.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/project/list` | Cross-workspace paginated list. Optional `workspaceId` query param narrows it. Includes soft-deleted projects |
| `GET` | `/admin/project/get/:projectId` | Any project by id, with no workspace scope and no active filter, so a soft-deleted project is still returned |

## Access Control

The guards run in this order, first to last: `ApiKeyXApiKeyGuard` → JWT → `FeatureFlagGuard` → `UserGuard` → `WorkspaceGuard` → `WorkspaceMemberGuard` → `ProjectGuard` → `ProjectMemberGuard` → the policy ability guard → the policy enforcement guard → `TermPolicyGuard`. Each guard reads what the previous one stored and never re-fetches.

- **`ProjectGuard`** reads the `projectId` route param and the workspace `WorkspaceGuard` resolved, then loads the project **constrained to that workspace and to non-deleted rows**. A missing param, a soft-deleted project, and a project belonging to a different workspace all collapse into the same `ProjectNotFoundException` (404, `51700`). Cross-workspace probing therefore cannot distinguish "not yours" from "does not exist".
- **`WorkspaceMemberGuard`** and **`ProjectMemberGuard`** are membership-only. They store the member rows and load no policies. With `{ required: false }` a caller with no `ProjectMember` row passes and no member is stored.
- **`ProjectPolicyAbilityGuard`** builds the ability from the platform role, the workspace role of the acting member, and the project role of the acting project member when one exists, in that order, and stores it under `PolicyAbilityStoreKey`. An ability already stored is reused and never overwritten.
- **`ProjectPolicyGuard`** and **`ProjectMemberPolicyGuard`** decide against that ability (see [Project policy decorators](#project-policy-decorators)).

A workspace `admin` does not inherit project read or update: its workspace role grants only project `create` and `delete`. The `owner` role grants `create`, `read`, `update`, and `delete` on `project` and `create`, `update`, and `delete` on `projectMember`, which is what lets it act on every project without a membership row.

### Guards and Decorators

Located at `src/modules/project/decorators`. For where these sit in the full protection stack, see [Authorization][ref-doc-authorization].

#### `ProjectProtected()`

**Method decorator** that applies `ProjectGuard`. It requires `@WorkspaceProtected()` below it - a project is always reached through its workspace.

Reads the `projectId` **route parameter** (there is no project header) and resolves it through `ProjectDomain.validateProjectGuard`, constrained to the workspace `WorkspaceGuard` resolved. The result is stored under `ProjectStoreKey`. No active workspace throws `WorkspaceNotFoundException` (404, `51600`).

#### `ProjectMemberProtected({ required?: boolean })`

**Method decorator**. Stack it above `@ProjectProtected()`. It applies `ProjectMemberGuard` in one of two modes:

- **Strict (the default, `@ProjectMemberProtected()`)** demands a real `ProjectMember` row and stores it with its minimal role (`id`, `scope`, `key`, `name`, no policies) under `ProjectMemberStoreKey`. No row throws `ProjectMemberForbiddenException` (403, `51701`). This is the form used by `member leave`, which has nothing to remove without a row.
- **`{ required: false }`** lets a caller with no row through, so a workspace role that holds the capability (the `owner`) still passes the project policy decorator. Every policy-gated project route uses this form.

In both modes the guard stores a row it finds and loads no policies.

#### Project policy decorators

Each composes `ProjectPolicyAbilityGuard` with one enforcement guard and sits above `@ProjectMemberProtected(...)`.

| Decorator | Enforcement guard | Judges |
|---|---|---|
| `@ProjectPolicyProtected(...actions)` | `ProjectPolicyGuard` | The project record `ProjectGuard` stored, tagged as `Project` |
| `@ProjectMemberPolicyProtected(...actions)` | `ProjectMemberPolicyGuard` | The member `:projectMemberId` addresses. The target loads through the policy predicate (a record the ability does not reach answers `ProjectMemberNotFoundException`), is judged as a tagged record, and is stored for `@ProjectMemberTargetCurrent()`. A route with no `:projectMemberId` (assign) takes the subject-type check only |

Both take actions only, so the subject is fixed. `@PolicyAbilityProtected(project)` builds the same ability and enforces nothing; the permissions route uses it.

#### `ProjectCurrent()` / `ProjectMemberCurrent()`

**Parameter decorators** that read back the `Project` and the `ProjectMember` with its role (`IProjectMemberWithRole`) the guards stored. `@ProjectMemberTargetCurrent()` reads the target member `ProjectMemberPolicyGuard` authorized, which is the addressed member. Each takes an optional field name typed against its model and returns the whole row without one. Both return a non-null value.

- `ProjectCurrent()` on a route without `@ProjectProtected()` answers `RequestContextMissingException` (500, `50304`).
- `ProjectMemberCurrent()` is valid only on a route carrying the strict `@ProjectMemberProtected()`. A `{ required: false }` route can hold no member row, so the read answers `RequestContextMissingException` (500, `50304`) there. `ProjectMemberDomain.leaveProject` receives the row itself; the caller's missing membership is already refused by the guard with `ProjectMemberForbiddenException` (403, `51701`).

The store readers: [Security and Middleware][ref-doc-security-and-middleware].

### The `/admin` scope takes none of this

Admin routes carry no project or workspace guard. They take the project id from the path and are gated by `@PlatformPolicyProtected()` instead.

## Slug

- **Creation always generates the slug.** `ProjectCreateRequestDto` carries no slug field: `ProjectDomain.createProject` draws `project.slugMaxAttempts` (5) candidates of `project.slugPrefix` plus random characters up to `slugMaxLength` and passes them to `ProjectRepository.create`, which walks them. Choosing a slug is what `PATCH /user/project/update/:projectId/slug` is for, and only that path runs `assertSlugAllowed`.
- A slug sent to `update/:projectId/slug` is validated by `ProjectDomain.assertSlugAllowed`: over `project.slugMaxLength`, or failing `project.slugRegex`, throws `ProjectSlugInvalidException` (400, `51706`). A slug already held in the workspace throws `ProjectSlugAlreadyExistsException` (400, `51705`), with no retry.
- **Uniqueness is per workspace**, matching the `@@unique([workspaceId, slug])` index.
- `existsBySlugInWorkspace`, the check behind slug update, counts holders across **all** rows including soft-deleted ones. The unique index has no `deletedAt` component, so a soft-deleted project still holds its slug, and the check agrees with the index.
- `createProject` prepares `projectCreated`, then calls `ProjectRepository.create(workspaceId, dto, slugCandidates)`. The repository runs one `client.project.create` per candidate with no transaction; a unique collision on `slug`, recognised by `DatabaseUtil.isUniqueCollision`, moves to the next candidate. The event is staged once, after the create resolves, so a collision stages nothing. Any other error is rethrown untouched, and exhausting the candidates throws `DatabaseUniqueValueGenerationFailedException` (500, `51800`). See [Generated Unique Values][ref-doc-database-generated-unique-values].

## Membership

A project member must already be a workspace member. `assignMember` resolves the target's `WorkspaceMember` row first and throws `WorkspaceMemberNotFoundException` (404, `51605`) when there is none. That check runs at assign time only.

| Operation | Rules |
|---|---|
| Assign | Peer rule on the requested role. Throws `ProjectMemberAlreadyAssignedException` (400, `51704`) when the user already belongs |
| Update role | Peer rule on **both** the target's current role and the new role. Unknown member throws `ProjectMemberNotFoundException` (404, `51703`) |
| Remove | Peer rule on the target's role. Removing yourself throws `ProjectMemberPeerForbiddenException` (403, `51702`); use leave instead. The row is hard-deleted |
| Leave | No peer check. The last project `admin` is rejected. The caller's own row is hard-deleted |

**Peer rule.** `assertProjectMemberPeerAllowed` throws `ProjectMemberPeerForbiddenException` (403, `51702`) when the actor's ability lacks `projectMember:[update]` and any role involved in the operation is `admin`. `ProjectMemberHttpService` computes that capability from the request ability and passes it to the domain.

**Last-admin protection.** Removing, demoting, or leaving as the only project `admin` throws `ProjectMemberLastAdminException` (`51707`). `assertNotLastAdmin` counts the remaining admins first.

Each membership change is a single write on `ProjectMemberRepository` (`create`, `updateRole`, `removeMember`) with no transaction. Its activity rows are prepared before the write and staged after it. Assign, update role, and remove write an actor row for the caller carrying `targetUserId`, and a target row for the affected member carrying `actorUserId`, with `createdBy` set to the caller:

| Operation | Actor row | Target row |
|---|---|---|
| Assign | `projectMemberAssigned` | `projectMemberAssignedByAdmin` |
| Update role | `projectMemberRoleUpdated` | `projectMemberRoleUpdatedByAdmin` |
| Remove | `projectMemberRemoved` | `projectMemberRemovedByAdmin` |
| Leave | `projectMemberLeft` | none |

A caller who assigns themselves or updates their own role gets the actor row only. Both rows of a pair carry the project's `workspaceId`. See [Activity Log][ref-doc-activity-log].

## Soft Delete

`ProjectDomain.softDeleteProject` prepares `projectDeleted`, calls `ProjectRepository.softDelete`, which runs `client.project.softDelete` with no transaction (it sets `deletedAt` and stamps `deletedBy` and `updatedBy` from the caller), then stages the event. **It cascades to nothing**: `ProjectMember` rows and any invite referencing the project are left as they are, and the slug stays occupied.

After deletion the project disappears from `ProjectGuard` and from the user-scope list, but the admin routes still return it because they apply no active filter. There is no restore and no hard delete.

Deleting the **workspace** soft-deletes its still-active projects in the same transaction; each project gets the workspace's `deletedAt`, and `deletedBy` set to the caller. See [Workspace][ref-doc-workspace].

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

`ProjectDomain` reads all four: `slugRegex` and `slugMaxLength` for validation, `slugPrefix`, `slugMaxLength`, and `slugMaxAttempts` when it draws the candidates `ProjectRepository.create` walks through.

## Status Codes

| Member | statusCode | httpStatus | Meaning |
|---|---|---|---|
| `notFound` | `51700` | 404 | Unknown, soft-deleted, or out-of-workspace project |
| `memberForbidden` | `51701` | 403 | Caller holds no `ProjectMember` row on a strict route |
| `memberPeerForbidden` | `51702` | 403 | Operation involves an `admin` and the actor's ability lacks `projectMember:[update]`, or self-removal |
| `memberNotFound` | `51703` | 404 | Target member row does not exist in this project |
| `memberAlreadyAssigned` | `51704` | 400 | User already belongs to the project |
| `slugAlreadyExists` | `51705` | 400 | Slug already taken in this workspace |
| `slugInvalid` | `51706` | 400 | Slug fails the pattern or the length cap |
| `memberLastAdmin` | `51707` | 400 | Removal, demotion, or leave of the only project `admin` |

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
[ref-doc-activity-log]: activity-log.md
[ref-doc-security-and-middleware]: security-and-middleware.md

[ref-contributor-gzerox]: https://github.com/Gzerox
