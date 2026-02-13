# Project Documentation

This documentation explains the features and usage of the **Project Module**:
- **Project Module**: Located at `src/modules/project`
- **ProjectPermissionProtected**: Located at `src/modules/project/decorators`
- **ProjectMemberCurrent**: Located at `src/modules/project/decorators`

## Overview

The Project module provides project management with project-level membership and permission checks for both:
- User-owned projects (`/shared/projects`)
- Tenant-owned projects (`/shared/tenants/projects`)

It supports:
- Project create/list/get in user context
- Project CRUD within tenant context
- Project member management
- Shared user project listing
- Project-scoped permission validation using role abilities
- Soft delete behavior for projects and memberships

This module builds on top of existing tenant, authentication, authorization, response, and pagination infrastructure.

## Related Documents

- [Tenant Documentation][ref-doc-tenant] - Tenant context, `x-tenant-id`, tenant membership and tenant permissions
- [Authorization Documentation][ref-doc-authorization] - Guard/decorator authorization patterns
- [Authentication Documentation][ref-doc-authentication] - JWT and user context requirements
- [Pagination Documentation][ref-doc-pagination] - Query and response pagination behavior
- [Response Documentation][ref-doc-response] - Standard response envelope and status/message handling
- [Request Validation Documentation][ref-doc-request-validation] - DTO validation details

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Architecture](#architecture)
  - [Components](#components)
  - [Request Flow](#request-flow)
  - [Authorization Layers](#authorization-layers)
- [REST API Endpoints](#rest-api-endpoints)
  - [Shared Endpoints](#shared-endpoints)
  - [Tenant Shared Endpoints](#tenant-shared-endpoints)
- [Decorators and Guards](#decorators-and-guards)
  - [ProjectPermissionProtected](#projectpermissionprotected)
  - [ProjectMemberCurrent](#projectmembercurrent)
  - [ProjectMemberGuard](#projectmemberguard)
  - [ProjectPermissionGuard](#projectpermissionguard)
  - [Mapping Utility](#mapping-utility)
- [Data Contracts](#data-contracts)
  - [Request DTOs](#request-dtos)
  - [Response DTOs](#response-dtos)
  - [Access Type](#access-type)
- [Business Rules](#business-rules)
- [Usage Examples](#usage-examples)
  - [Project Read Endpoint with Project Permissions](#project-read-endpoint-with-project-permissions)
  - [Project Member Access](#project-member-access)
- [Important Notes](#important-notes)
- [Future Improvements](#future-improvements)
  - [Future-proof](#future-proof)
  - [Flexibility](#flexibility)
  - [Performance](#performance)
  - [Security](#security)

## Architecture

### Components

- `ProjectService` (`src/modules/project/services/project.service.ts`)
- `ProjectMemberService` (`src/modules/project/services/project-member.service.ts`)
- `ProjectRepository` (`src/modules/project/repositories/project.repository.ts`)
- `ProjectUtil` (`src/modules/project/utils/project.util.ts`)
- `ProjectMemberGuard` (`src/modules/project/guards/project.member.guard.ts`)
- `ProjectPermissionGuard` (`src/modules/project/guards/project.permission.guard.ts`)
- Shared controllers:
  - `ProjectSharedController` (`src/modules/project/controllers/project.shared.controller.ts`)
  - `ProjectTenantSharedController` (`src/modules/project/controllers/project-tenant.shared.controller.ts`)

### Request Flow

For project resource routes (`/:projectId` and nested member routes), the request goes through layered checks:

```mermaid
flowchart TD
    A[Client Request] --> B[@AuthJwtAccessProtected]
    B --> C[@UserProtected]
    C --> D[@TenantMemberProtected]
    D --> E[@ProjectPermissionProtected]
    E --> F[ProjectMemberGuard]
    F --> G[ProjectPermissionGuard]
    G --> H[Controller Handler]
```

`ProjectPermissionProtected` internally applies both project guards and sets required ability metadata.

### Authorization Layers

The module uses two authorization scopes:

1. Tenant-level permission (`@TenantPermissionProtected`) for tenant-wide project actions such as list/create.
2. Project-level membership + abilities (`@ProjectPermissionProtected`) for project resource actions such as read/update/delete/member operations.

This separation keeps tenant governance and project resource governance explicit.

## REST API Endpoints

Base path defaults to `/api/v1` (from app global prefix + URI versioning).

### Shared Endpoints

Controller: `ProjectSharedController` (`/projects`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `POST` | `/projects` | Create user-owned project (optionally share with members) | `ApiKey` + JWT + User |
| `GET` | `/projects` | List projects accessible by current user | `ApiKey` + JWT + User |
| `GET` | `/projects/:projectId` | Get one project if current user is active member | `ApiKey` + JWT + User |

These routes are user-centric project access endpoints.

### Tenant Shared Endpoints

Controller: `ProjectTenantSharedController` (`/tenants/projects`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `GET` | `/tenants/projects` | List tenant projects | `TenantPermission(project:read)` |
| `POST` | `/tenants/projects` | Create tenant-owned project (optionally share with members) | `TenantPermission(project:create)` |
| `GET` | `/tenants/projects/:projectId` | Get project detail | `TenantMember` + `ProjectPermission(project:read)` |
| `PATCH` | `/tenants/projects/:projectId` | Update name/status | `TenantMember` + `ProjectPermission(project:update)` |
| `DELETE` | `/tenants/projects/:projectId` | Soft-delete project | `TenantMember` + `ProjectPermission(project:delete)` |
| `POST` | `/tenants/projects/:projectId/members` | Add member (role provided in request) | `TenantMember` + `ProjectPermission(project:update)` |
| `PATCH` | `/tenants/projects/:projectId/members/:memberId` | Update member role and/or status | `TenantMember` + `ProjectPermission(project:update)` |
| `GET` | `/tenants/projects/:projectId/members` | List active members | `TenantMember` + `ProjectPermission(project:read)` |

All endpoints also include `ApiKey`, `@AuthJwtAccessProtected`, and `@UserProtected`.

`/tenants/projects` routes are only available when tenancy is enabled.

## Decorators and Guards

### ProjectPermissionProtected

`ProjectPermissionProtected(...requiredAbilities)`:
- Applies `ProjectMemberGuard` and `ProjectPermissionGuard`
- Stores required abilities in metadata key `ProjectPermissionRequiredMetaKey`

Example:

```typescript
@ProjectPermissionProtected({
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.update],
})
@Patch('/:projectId')
async updateProject(...) {}
```

### ProjectMemberCurrent

`@ProjectMemberCurrent()` reads `request.__projectMember`, populated by `ProjectMemberGuard`.

Example:

```typescript
@Get('/:projectId/me')
@ProjectPermissionProtected({
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.read],
})
getMembership(
    @ProjectMemberCurrent() member: IProjectMember
) {
    return { memberId: member.id, role: member.role?.name };
}
```

### ProjectMemberGuard

Primary validations (implemented in `ProjectService.validateProjectMemberGuard`):

1. `request.user` must exist.
2. `request.params.projectId` must be a valid database id.
3. User must have active membership in that project.
4. Membership role must exist and have scope `project`.

On success, stores member context in `request.__projectMember`.

### ProjectPermissionGuard

Primary validations (implemented in `ProjectService.validateProjectPermissionGuard`):

1. Required abilities metadata must exist (non-empty).
2. Build CASL ability from project member role abilities.
3. Check user ability against required abilities.

Rejects with forbidden when ability check fails.

### Mapping Utility

`ProjectUtil` centralizes response mapping so services stay focused on business logic:

- `mapProject(...)`
- `mapMember(...)`
- `mapMemberProjectAccess(...)`

Used by:
- `ProjectService` for project response mapping
- `ProjectMemberService` for member and access response mapping

## Data Contracts

### Request DTOs

- `ProjectCreateRequestDto`
  - `name: string` (required, max 100)
  - `members?: { userId: string; roleName: string }[]` (optional)
- `ProjectUpdateRequestDto`
  - `name?: string` (max 100)
  - `status?: EnumProjectStatus`
- `ProjectMemberCreateRequestDto`
  - `userId: string` (required)
  - `roleName: string` (required)
- `ProjectMemberUpdateRequestDto`
  - `roleName?: string`
  - `status?: EnumProjectMemberStatus`

For validation mechanics and error shape, see [Request Validation Documentation][ref-doc-request-validation].

### Response DTOs

- `ProjectResponseDto`
  - `id`, `tenantId?`, `name`, `status`, `createdAt`, `updatedAt`
- `ProjectMemberResponseDto`
  - `id`, `projectId`, `userId`, `roleName`, `status`, `createdAt`
- `ProjectAccessResponseDto`
  - `accessType`, `project`

For response envelope format (`statusCode`, `message`, `data`), see [Response Documentation][ref-doc-response].

### Access Type

`ProjectAccessResponseDto.accessType` uses a string literal union:
- `'member'`
- `'shared'`

Current implementation returns `'member'` from shared listing APIs.

## Business Rules

- New projects are created as `active`.
- On project creation, creator is automatically added as active `project-admin` member.
- `POST /shared/projects` creates a user-owned project (`ownerUserId = creator`, `tenantId = null`).
- `POST /shared/tenants/projects` creates a tenant-owned project (`tenantId = current tenant`, `ownerUserId = null`).
- Project creation can include optional initial members (`members[]`) with project roles.
- Updating with no effective fields (`name` and `status` both omitted) is a no-op success.
- Deleting a project is soft-delete (`status: inactive`, sets `deletedAt`, `deletedBy`).
- Adding a project member:
  - User must exist
  - Membership must not already exist
  - Role is required in request (`roleName`) and must exist in `project` scope
- Updating a project member:
  - Member must belong to the project
  - Update can include `roleName`, `status`, or both
  - Empty patch payload is treated as no-op success
- Listing project members only returns active memberships.
- User project listing only returns active memberships and active projects.

## Usage Examples

### Project Read Endpoint with Project Permissions

```typescript
@Response('project.get')
@TenantMemberProtected()
@ProjectPermissionProtected({
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.read],
})
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@Get('/:projectId')
async get(
    @Param('projectId', RequestRequiredPipe) projectId: string
): Promise<IResponseReturn<ProjectResponseDto>> {
    return this.projectService.getOne(projectId);
}
```

### Project Member Access

```typescript
@ProjectPermissionProtected({
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.read],
})
@Get('/:projectId/membership')
async membership(
    @ProjectMemberCurrent() member: IProjectMember
) {
    return {
        id: member.id,
        projectId: member.projectId,
        roleName: member.role?.name,
        status: member.status,
    };
}
```

## Important Notes

- Project member guard currently expects `projectId` in route params.
- The module is wired via `RoutesSharedModule` and exposed as shared API routes.
- User-scoped project endpoints (`/shared/projects`) do not require tenant context.
- Tenant-scoped project endpoints (`/shared/tenants/projects`) are mounted via `TenantRoutesSharedModule` only when `TENANCY_ENABLED=true`.
- For tenant-scoped project resource routes, both tenant membership and project permission guards are applied.
- Role abilities are evaluated via policy ability factory; role scope must be `project`.

## Future Improvements

### Future-proof

1. Add idempotency support for create/member-add endpoints to improve API reliability under retries.
2. Version project access contracts (`ProjectAccessResponseDto`) to support future shared/inherited access models.

### Flexibility

1. Support bulk member add/remove operations for enterprise onboarding flows.
2. Expose filtering options on member list (role, status, joined date) using pagination filter decorators.

### Performance

1. Use cursor pagination for high-cardinality member/project listings where offset becomes expensive.
2. Add compound indexes aligned with query patterns (`projectId + userId + status + deletedAt`, `tenantId + status + deletedAt`).
3. Cache short-lived membership/role-ability lookups for heavily accessed project APIs.
4. Reduce repeated permission evaluation by attaching computed project ability context once per request.

### Security

1. Add anti-enumeration controls on membership checks (uniform error responses, optional rate limiting for repeated id probes).
2. Add structured audit logging for project CRUD/member changes (actor, project, tenant, diff metadata).


<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-pagination]: pagination.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-tenant]: tenant.md
