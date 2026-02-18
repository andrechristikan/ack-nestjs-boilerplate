# Invitation Documentation

This documentation explains the invitation feature used by tenant and project membership flows:
- **Invitation Module**: `src/modules/invitation`
- **Invitation Service**: `src/modules/invitation/services/invitation.service.ts`
- **Invitation Provider Contracts**: `src/modules/invitation/interfaces/invitation.interface.ts`

## Overview

The invitation feature allows membership creation by email and account activation through invitation tokens.

It supports:
- Creating pending memberships for tenant or project scope.
- Sending context-aware invitation emails (for example tenant/project name).
- Invitation resend cooldown and expiration handling.
- Public invitation completion flow (`/public/user/invitation/...`) for first-time account setup.

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
  - [Invitation Context and Metadata](#invitation-context-and-metadata)
- [REST API Endpoints](#rest-api-endpoints)
  - [Tenant Member Invitation Endpoints](#tenant-member-invitation-endpoints)
  - [Project Member Invitation Endpoints](#project-member-invitation-endpoints)
  - [Public Invitation Endpoints](#public-invitation-endpoints)
- [Data Contracts](#data-contracts)
  - [Request DTOs](#request-dtos)
  - [Response DTOs](#response-dtos)
- [Business Rules](#business-rules)
  - [Create Invitation](#create-invitation)
  - [Send Invitation](#send-invitation)
  - [Complete Invitation](#complete-invitation)
- [Important Notes](#important-notes)

## Architecture

### Core Components

- `InvitationService` orchestrates invitation creation/sending in a scope-agnostic way.
- `UserService` handles invitation verification records, resend limits, and completion.
- `EmailService` queues invitation emails.
- `EmailUtil` renders and sends invitation templates.

### Provider Pattern

Invitation context is injected via providers implementing `InvitationProvider`:

- `ProjectInvitationProvider` (`src/modules/project/services/project-invitation.provider.ts`)
- `TenantInvitationProvider` (`src/modules/tenant/services/tenant-invitation.provider.ts`)

Each provider supplies:
- Membership operations (`existsMember`, `addMember`, `findMemberUserId`)
- Invitation context (`invitationType`, `roleScope`, `getContextName`)

This keeps `InvitationService` reusable across multiple invitation origins.

### Invitation Context and Metadata

`InvitationContext` is propagated from provider to user/email layers and includes:
- `invitationType` (`tenant_member` or `project_member`)
- `roleScope`
- `contextId`
- `contextName`

When an invitation is sent, context is stored in `Verification.metadata` for auditability and deterministic rendering.

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

### Public Invitation Endpoints

Controller: `UserPublicController` (`/public/user`)

| Method | Path | Description | Protection |
|-------|------|-------------|------------|
| `GET` | `/public/user/invitation/:token` | Resolve invitation token status and invited email | `ApiKey` |
| `PUT` | `/public/user/invitation/complete` | Complete invitation with name and password | `ApiKey` |

## Data Contracts

### Request DTOs

- `InvitationCreateRequestDto`
  - `email: string` (required, normalized lowercase)
  - `roleId: string` (required)
- `UserInvitationCompleteRequestDto`
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
  - `status: not_sent | pending | expired | completed`
  - optional `expiresAt`, `remainingSeconds`, `sentAt`, `completedAt`
- `UserInvitationResponseDto`
  - `email`, `status`, optional expiration fields

For envelope format (`statusCode`, `message`, `data`), see [Response Documentation][ref-doc-response].

## Business Rules

### Create Invitation

- Role must exist in the provider role scope (`tenant` or `project`).
- Email is normalized (`lowercase + trim`).
- If user does not exist, a pending user is created for invitation flow.
- Membership conflict returns `409`.
- Returned payload includes current invitation lifecycle status.

### Send Invitation

- Member must exist in the given context.
- Sending is blocked if invited user is already verified.
- Resend is rate-limited by configured invitation resend window.
- New verification token invalidates prior active invitation tokens for that user.
- Email template receives context (`roleScope`, `contextName`) from provider.

### Complete Invitation

- Token must be valid for invitation verification type.
- Completion sets user name/password, marks user verified, and marks token used.
- Other active invitation tokens for that user are expired.

## Important Notes

- Invitation lifecycle is shared across tenant/project entry points through provider contracts.
- Context-aware invitation emails are rendered from a single invitation template.
- Invitation context metadata is persisted on verification records.
- Public invitation completion is intentionally separate from tenant/project protected routes.

<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-project]: project.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-tenant]: tenant.md
