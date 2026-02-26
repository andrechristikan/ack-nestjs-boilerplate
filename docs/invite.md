# Invitation Documentation

This documentation explains the invite feature used by tenant and project membership flows:
- **Invite Module**: `src/modules/invite`
- **Invite Service**: `src/modules/invite/services/invite.service.ts`
- **Invite Repository**: `src/modules/invite/repositories/invite.repository.ts`
- **Invite Provider Contracts**: `src/modules/invite/interfaces/invite.interface.ts`

## Overview

The invite feature allows membership creation by email and account activation through invite tokens.

It supports:
- Creating pending memberships for tenant or project scope.
- Sending context-aware invite emails (for example tenant/project name).
- Invitation resend cooldown and expiration handling.
- Soft-deleting pending invites.
- Public invitation accept/signup flows (`/invite/...`) for verified and unverified users.

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
  - [Invite Data Model](#invitation-data-model)
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
  - [Invite Signup (Unverified User)](#invite-signup-unverified-user)
- [Important Notes](#important-notes)

## Architecture

### Core Components

- `InviteService` orchestrates all invitation operations (create, send, delete, signup, accept, list, get) in a scope-agnostic way, including the full send logic previously split across `UserService`.
- `InviteRepository` owns `Invite` persistence and invite-related user updates (accept/signup activity and verification writes) for invitation flows (`src/modules/invite/repositories/invite.repository.ts`).
- `InviteProviderRegistry` stores runtime-registered invite providers by `EnumInviteType`, allowing `InviteService` to resolve the correct feature adapter during accept/signup without importing tenant/project modules directly.
- `UserService` creates placeholder users for invitation flows (`createForInvitation`). It no longer owns any invitation verification logic.
- `UserRepository` handles user record creation for invitations (`createByInvitation`).
- `InviteUtil` provides invitation token/reference/expiry generation, resend window configuration, link creation, and invitation status mapping.
- `EmailService` sends invitation and post-completion emails.

### Provider Pattern

Feature modules provide invite adapters implementing `InviteProvider`:

- `ProjectInviteProvider` (`src/modules/project/services/project-invite.provider.ts`)
- `TenantInviteProvider` (`src/modules/tenant/services/tenant-invite.provider.ts`)

Each provider supplies:
- Membership operations (`findMemberByUserId`, `createMember`, `findMemberUserId`)
- Membership activation for invite acceptance/signup (`activateMemberForInvite`)
- Invitation context (`invitationType`, `roleScope`, `signUpFrom`, `getContextName`)

Providers self-register into `InviteProviderRegistry` during module initialization (`OnModuleInit`).

This keeps `InviteService` reusable across multiple invitation origins and avoids direct module-to-module coupling (for example `InviteService` importing tenant/project providers).

Invitation-created memberships are created as `pending` and do not grant access until the invitation is accepted.

### Invite Data Model

Invitations are persisted in the dedicated Prisma `Invite` model (not `Verification`).

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

A context payload is assembled by `InviteService` at send time and includes:
- `invitationType` (`EnumInviteType.tenantMember` or `EnumInviteType.projectMember`)
- `roleScope`
- `contextId`
- `contextName`

These fields are stored directly on `Invite` for queryability.

`Invite.metadata` remains available as optional JSON for audit/extensions, but core filtering does not depend on JSON-path queries.

Soft-deletion is tracked via `Invite.deletedAt` and `Invite.deletedBy`.

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

Controller: `InviteSharedController` (`/invites`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `GET` | `/shared/invites` | List the logged-in user’s pending, valid (actionable) invitations | `UserProtected` + `AuthJwtAccessProtected` + `ApiKeyProtected` |

### Public Invitation Endpoints

Controller: `InvitePublicController` (`/invite`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `GET` | `/invite/:token` | Resolve invitation token status and invited email | `ApiKey` |
| `PUT` | `/invite/accept` | Accept invitation for an already-verified user | `ApiKey` |
| `PUT` | `/invite/signup` | Sign up by invite (set profile/password) and accept invitation for an unverified user | `ApiKey` |

## Data Contracts

### Request DTOs

- `InviteCreateRequestDto`
  - `email: string` (required, normalized lowercase)
  - `roleId: string` (required)
- `InviteAcceptRequestDto`
  - `token: string` (required)
- `InviteSignupRequestDto`
  - `token: string` (required)
  - `firstName: string` (required)
  - `lastName: string` (required)
  - `password: string` (required)

For validation behavior and error formatting, see [Request Validation Documentation][ref-doc-request-validation].

### Response DTOs

- `InviteCreateResponseDto`
  - `memberId`, `userId`, `email`, `invitation`
- `InviteSendResponseDto`
  - `invitation`, `resendAvailableAt`
- `InviteStatusResponseDto`
  - `status: not_sent | pending | expired | completed | deleted`
  - optional `expiresAt`, `remainingSeconds`, `sentAt`, `completedAt`, `deletedAt`
- `InvitePublicResponseDto`
  - `email`, `isVerified`, `status`, optional expiration fields

For envelope format (`statusCode`, `message`, `data`), see [Response Documentation][ref-doc-response].

## Business Rules

### Create Invitation

- Role must exist in the provider role scope (`tenant` or `project`).
- Email is normalized (`lowercase + trim`).
- If user does not exist, a placeholder user is created via `UserService.createForInvitation`.
- Membership conflict returns `409`.
- If a pending membership already exists for the same user+context, creation is idempotent and returns the existing member.
- A pending `Invite` row is created during this endpoint if no active invitation already exists for the same user+context.
- The create endpoint prepares the invitation and membership target, but does not send email.
- Returned payload includes current invitation lifecycle status.

### Send Invitation

- Member must exist in the given context (resolved by the provider).
- Context name is resolved by the provider; missing context returns `404`.
- User must be active. Already-verified users are allowed and can still receive invitation links.
- Resend is rate-limited by the configured invitation resend window (`InviteUtil.inviteResendInMinutes`) using `Invite.sentAt`.
- The send endpoint normally reuses the active invitation created by the create endpoint and updates `Invite.sentAt`.
- If no active invitation exists (fallback path), the send endpoint creates one before sending.
- The invitation stores the target membership id (`memberId`) and context fields as scalar columns so acceptance can activate the correct pending member.
- `Invite.metadata` is optional extension/audit payload and is not used for resend cooldown or core filtering.
- Email is sent through `EmailService.sendInvite`.

### Delete Invitation

- Only the latest active (non-expired, non-accepted) non-deleted invitation can be deleted.
- Soft-delete is recorded via `Invite.deletedAt` and `Invite.deletedBy` — the invitation is not marked as accepted.
- Deleted invitations are excluded from default lookups; a repeated delete returns `404` (`not found`).
- Pending tenant/project memberships are retained (not auto-deleted) after invitation deletion.

### Invite Signup (Unverified User)

- Token must resolve to an active (non-expired, non-accepted) invitation record.
- Soft-deleted invitations are not active and cannot be completed.
- `PUT /invite/accept` is for already-verified users and accepts the invitation (`acceptedAt` is set).
- `PUT /invite/signup` is for unverified users and requires `firstName`, `lastName`, and `password`, then sets name/password, marks the user verified, accepts the invitation (`acceptedAt`), and expires all remaining active invitations for that user.
- Both endpoints activate the related tenant/project membership (`pending -> active`) before access is granted.
- A post-verification email is sent via `EmailService.sendVerified` only when the user is newly verified in this flow.
- Membership activation is delegated to the feature-specific `InviteProvider` implementation (tenant/project), not `InviteRepository`.
- Current implementation coordinates provider activation + invite/user updates sequentially (no cross-module shared transaction yet). A `TODO` in `InviteService` tracks adopting a shared transaction strategy for multi-repository operations.

## Important Notes

- Invitation lifecycle is shared across tenant/project entry points through provider contracts.
- `InviteRepository` does not update `TenantMember` or `ProjectMember`; membership activation belongs to the respective feature provider/module.
- `InviteProviderRegistry` allows feature modules to register invite providers dynamically by `EnumInviteType`.
- `InviteRepository` is the single owner of all `Invite` record operations for invitation flows. `UserRepository` is only used for user lookup/creation, not invitation persistence.
- Invitation soft-deletion uses `Invite.deletedAt` / `Invite.deletedBy`.
- Queryable invitation context fields (`invitationType`, `roleScope`, `contextId`, `contextName`, `memberId`) are stored as scalar columns on `Invite`.
- `Invite.metadata` is optional and intended for audit/extension payloads, not required for core filtering.
- Logged-in users can list their actionable pending invitations via `GET /shared/invites`.
- Public invite signup/accept flows are intentionally separate from tenant/project protected routes.

<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-project]: project.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-tenant]: tenant.md
