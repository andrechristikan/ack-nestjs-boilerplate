# Invitation Documentation

This documentation explains the invitation feature used by tenant and project membership flows:
- **Invitation Module**: `src/modules/invitation`
- **Invitation Service**: `src/modules/invitation/services/invitation.service.ts`
- **Invitation Repository**: `src/modules/invitation/repositories/invitation.repository.ts`
- **Invitation Provider Contracts**: `src/modules/invitation/interfaces/invitation.interface.ts`

## Overview

The invitation feature allows membership creation by email and account activation through invitation tokens.

It supports:
- Creating pending memberships for tenant or project scope.
- Sending context-aware invitation emails (for example tenant/project name).
- Invitation resend cooldown and expiration handling.
- Soft-deleting pending invitations.
- Public invitation accept/complete flows (`/invitation/...`) for verified and unverified users.

## Related Documents

- [Tenant Documentation][ref-doc-tenant] - Tenant member endpoints and tenant permission model
- [Project Documentation][ref-doc-project] - Project member endpoints and project permission model
- [Authentication Documentation][ref-doc-authentication] - Shared authentication and user verification context
- [Request Validation Documentation][ref-doc-request-validation] - DTO validation behavior
- [Response Documentation][ref-doc-response] - Standard response envelope format

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Architecture](#architecture)
  - [Core Components](#core-components)
  - [Provider Pattern](#provider-pattern)
  - [Invitation Data Model](#invitation-data-model)
- [REST API Endpoints](#rest-api-endpoints)
  - [Tenant Member Invitation Endpoints](#tenant-member-invitation-endpoints)
  - [Project Member Invitation Endpoints](#project-member-invitation-endpoints)
  - [Shared Invitation Endpoints](#shared-invitation-endpoints)
  - [Public Invitation Endpoints](#public-invitation-endpoints)
- [Data Contracts](#data-contracts)
  - [Request DTOs](#request-dtos)
  - [Response DTOs](#response-dtos)
- [Business Rules](#business-rules)
  - [Create Invitation](#create-invitation)
  - [Send Invitation](#send-invitation)
  - [Delete Invitation](#delete-invitation)
  - [Complete Invitation](#complete-invitation)
- [Important Notes](#important-notes)

## Architecture

### Core Components

- `InvitationService` orchestrates all invitation operations (create, send, delete, complete, list, get) in a scope-agnostic way, including the full send logic previously split across `UserService`.
- `InvitationRepository` owns all `Invitation` record operations for invitation flows (`src/modules/invitation/repositories/invitation.repository.ts`).
- `UserService` creates placeholder users for invitation flows (`createForInvitation`). It no longer owns any invitation verification logic.
- `UserRepository` handles user record creation for invitations (`createByInvitation`).
- `InvitationUtil` provides invitation token/reference/expiry generation, resend window configuration, link creation, and invitation status mapping.
- `EmailService` sends invitation and post-completion emails.

### Provider Pattern

Invitation context is injected via providers implementing `InvitationProvider`:

- `ProjectInvitationProvider` (`src/modules/project/services/project-invitation.provider.ts`)
- `TenantInvitationProvider` (`src/modules/tenant/services/tenant-invitation.provider.ts`)

Each provider supplies:
- Membership operations (`findMemberByUserId`, `createMember`, `findMemberUserId`)
- Invitation context (`invitationType`, `roleScope`, `signUpFrom`, `getContextName`)

This keeps `InvitationService` reusable across multiple invitation origins.

Invitation-created memberships are created as `pending` and do not grant access until the invitation is accepted.

### Invitation Data Model

Invitations are persisted in the dedicated Prisma `Invitation` model (not `Verification`).

Core scalar fields used by the module:
- `invitationType`
- `roleScope`
- `contextId`
- `contextName`
- `memberId`
- `token`
- `reference`
- `expiresAt`
- `sentAt`
- `acceptedAt`
- `deletedAt`, `deletedBy`

`InvitationContext` is assembled by `InvitationService` at send time and includes:
- `invitationType` (`EnumInvitationType.tenantMember` or `EnumInvitationType.projectMember`)
- `roleScope`
- `contextId`
- `contextName`

These fields are stored directly on `Invitation` for queryability.

`Invitation.metadata` remains available as optional JSON for audit/extensions, but core filtering does not depend on JSON-path queries.

Soft-deletion is tracked via `Invitation.deletedAt` and `Invitation.deletedBy`.

## REST API Endpoints

Base path defaults to `/api/v1`.

### Tenant Member Invitation Endpoints

Controller: `TenantSharedController` (`/shared/tenants`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `POST` | `/shared/tenants/current/members/invitations` | Create tenant membership by email and return invitation status | `TenantPermission(tenantMember:create)` |
| `POST` | `/shared/tenants/current/members/:memberId/invitations/send` | Send invitation email to tenant member | `TenantPermission(tenantMember:create)` |

### Project Member Invitation Endpoints

Controller: `ProjectTenantSharedController` (`/shared/tenants/projects`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `POST` | `/shared/tenants/projects/:projectId/members/invitations` | Create project membership by email and return invitation status | `TenantMember` + `ProjectPermission(projectMember:create)` |
| `POST` | `/shared/tenants/projects/:projectId/members/:memberId/invitations/send` | Send invitation email to project member | `TenantMember` + `ProjectPermission(projectMember:create)` |

### Shared Invitation Endpoints

Controller: `InvitationSharedController` (`/invitations`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `GET` | `/shared/invitations` | List the logged-in user’s pending, valid (actionable) invitations | `UserProtected` + `AuthJwtAccessProtected` + `ApiKeyProtected` |

### Public Invitation Endpoints

Controller: `InvitationPublicController` (`/invitation`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `GET` | `/invitation/:token` | Resolve invitation token status and invited email | `ApiKey` |
| `PUT` | `/invitation/accept` | Accept invitation for an already-verified user | `ApiKey` |
| `PUT` | `/invitation/complete` | Complete onboarding and accept invitation for an unverified user | `ApiKey` |

## Data Contracts

### Request DTOs

- `InvitationCreateRequestDto`
  - `email: string` (required, normalized lowercase)
  - `roleId: string` (required)
- `InvitationAcceptRequestDto`
  - `token: string` (required)
- `InvitationCompleteRequestDto`
  - `token: string` (required)
  - `firstName: string` (required)
  - `lastName: string` (required)
  - `password: string` (required)

For validation behavior and error formatting, see [Request Validation Documentation][ref-doc-request-validation].

### Response DTOs

- `InvitationCreateResponseDto`
  - `memberId`, `userId`, `email`, `invitation`
- `InvitationSendResponseDto`
  - `invitation`, `resendAvailableAt`
- `InvitationStatusResponseDto`
  - `status: not_sent | pending | expired | completed | deleted`
  - optional `expiresAt`, `remainingSeconds`, `sentAt`, `completedAt`, `deletedAt`
- `InvitationPublicResponseDto`
  - `email`, `isVerified`, `status`, optional expiration fields

For envelope format (`statusCode`, `message`, `data`), see [Response Documentation][ref-doc-response].

## Business Rules

### Create Invitation

- Role must exist in the provider role scope (`tenant` or `project`).
- Email is normalized (`lowercase + trim`).
- If user does not exist, a placeholder user is created via `UserService.createForInvitation`.
- Membership conflict returns `409`.
- If a pending membership already exists for the same user+context, creation is idempotent and returns the existing member.
- A pending `Invitation` row is created during this endpoint if no active invitation already exists for the same user+context.
- The create endpoint prepares the invitation and membership target, but does not send email.
- Returned payload includes current invitation lifecycle status.

### Send Invitation

- Member must exist in the given context (resolved by the provider).
- Context name is resolved by the provider; missing context returns `404`.
- User must be active. Already-verified users are allowed and can still receive invitation links.
- Resend is rate-limited by the configured invitation resend window (`InvitationUtil.invitationResendInMinutes`) using `Invitation.sentAt`.
- The send endpoint normally reuses the active invitation created by the create endpoint and updates `Invitation.sentAt`.
- If no active invitation exists (fallback path), the send endpoint creates one before sending.
- The invitation stores the target membership id (`memberId`) and context fields as scalar columns so acceptance can activate the correct pending member.
- `Invitation.metadata` is optional extension/audit payload and is not used for resend cooldown or core filtering.
- Email is sent through `EmailService.sendInvitation`.

### Delete Invitation

- Only the latest active (non-expired, non-accepted) non-deleted invitation can be deleted.
- Soft-delete is recorded via `Invitation.deletedAt` and `Invitation.deletedBy` — the invitation is not marked as accepted.
- Deleted invitations are excluded from default lookups; a repeated delete returns `404` (`not found`).
- Pending tenant/project memberships are retained (not auto-deleted) after invitation deletion.

### Complete Invitation

- Token must resolve to an active (non-expired, non-accepted) invitation record.
- Soft-deleted invitations are not active and cannot be completed.
- `PUT /invitation/accept` is for already-verified users and accepts the invitation (`acceptedAt` is set).
- `PUT /invitation/complete` is for unverified users and requires `firstName`, `lastName`, and `password`, then sets name/password, marks the user verified, accepts the invitation (`acceptedAt`), and expires all remaining active invitations for that user.
- Both endpoints activate the related tenant/project membership (`pending -> active`) before access is granted.
- A post-verification email is sent via `EmailService.sendVerified` only when the user is newly verified in this flow.

## Important Notes

- Invitation lifecycle is shared across tenant/project entry points through provider contracts.
- `InvitationRepository` is the single owner of all `Invitation` record operations for invitation flows. `UserRepository` is only used for user lookup/creation, not invitation persistence.
- Invitation soft-deletion uses `Invitation.deletedAt` / `Invitation.deletedBy`.
- Queryable invitation context fields (`invitationType`, `roleScope`, `contextId`, `contextName`, `memberId`) are stored as scalar columns on `Invitation`.
- `Invitation.metadata` is optional and intended for audit/extension payloads, not required for core filtering.
- Logged-in users can list their actionable pending invitations via `GET /shared/invitations`.
- Public invitation completion is intentionally separate from tenant/project protected routes.

<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-project]: project.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-tenant]: tenant.md
