# Invite Module Documentation

This documentation explains purpose and usage of the **Invite Module**:
- **Invite Module**: `src/modules/invite`
- **Invite Service**: `src/modules/invite/services/invite.service.ts`
- **Invite Config Registry**: `src/modules/invite/services/invite-config.registry.ts`
- **Invite Repository**: `src/modules/invite/repositories/invite.repository.ts`

## Overview

Invite module is a reusable, transport-agnostic core for invitation lifecycle.

It handles:
- invite issuance and resend flow,
- token/reference generation,
- invite persistence/state transitions,
- per-feature invite configuration registration and validation.

It does **not** handle:
- HTTP transport/controllers,
- domain-specific lookup/authorization (project/tenant membership business rules),
- endpoint docs ownership.

Consumer modules (Project, Tenant, future modules) own business validation and call `InviteService`.

## Related Documents

- [Configuration Documentation][ref-doc-configuration]
- [Project Documentation][ref-doc-project]
- [Tenant Documentation][ref-doc-tenant]
- [Authentication Documentation][ref-doc-auth]

## Table of Contents

- [Overview](#overview)
- [Current Scope](#current-scope)
- [Initialization Flow](#initialization-flow)
- [Config Model and Validation](#config-model-and-validation)
- [Public Service API](#public-service-api)
- [How Other Modules Reuse It](#how-other-modules-reuse-it)
- [Feature Registration Examples](#feature-registration-examples)
- [Runtime Failure Semantics](#runtime-failure-semantics)
- [Design Guidelines](#design-guidelines)
- [Important Notes](#important-notes)

## Current Scope

`InviteService` provides:
- `issueInvite(input)`
- `dispatchInvite(input)`
- `getInvite(input)`
- `listInvites(input?)`
- `deleteInvite(input)`
- `getActiveInviteForProcessing(input)`
- `finalizeInviteAccept(input)`
- `finalizeInviteSignup(input)`

All methods are service-level APIs for module-to-module usage.

## Initialization Flow

Invite initialization has two phases:

1. Global bootstrap with defaults:
- In `CommonModule`:
```ts
InviteModule.forRoot();
```
- This registers core providers:
  - `InviteService`
  - `InviteRepository`
  - `InviteConfigRegistry`
  - `InviteUtil`

2. Per-feature registration:
- In each consumer module (`ProjectModule`, `TenantModule`, etc.):
  - `InviteModule.forFeature(...)` or
  - `InviteModule.forFeatureAsync(...)`
- This registers config for one `invitationType`.
- Effective config is computed as:
  - `mergeInviteConfig(rootDefaults, featureOverride)`
- Effective config is validated before registration.

## Config Model and Validation

Root defaults come from:
- `src/configs/invite.config.ts` (`invite` key)

Config shape (`InviteConfig`):
- `expiredInMinutes`
- `tokenLength`
- `linkBaseUrl`
- `resendInMinutes`
- `reference.prefix`
- `reference.length`

Per-feature overrides use `InviteConfigOverride`.

Validation is defined in:
- `src/modules/invite/dtos/invite.config.dto.ts`

Rules:
- Positive integers:
  - `expiredInMinutes`
  - `tokenLength`
  - `resendInMinutes`
  - `reference.length`
- Non-empty strings:
  - `linkBaseUrl`
  - `reference.prefix`

## Public Service API

### Issue Invite

```ts
await this.inviteService.issueInvite({
  invitationType: ProjectInvitationType,
  roleScope: EnumRoleScope.project,
  contextId: projectId,
  contextName: project.name,
  memberId,
  userId: user.id,
  requestedBy: actorId,
});
```

### Dispatch Invite

```ts
await this.inviteService.dispatchInvite({
  invitationType: ProjectInvitationType,
  roleScope: EnumRoleScope.project,
  emailTypeLabel: ProjectInviteEmailTypeLabel,
  contextId: projectId,
  contextName: project.name,
  memberId,
  userId: user.id,
  requestLog,
  requestedBy: actorId,
});
```

## How Other Modules Reuse It

Recommended pattern:
1. Consumer module resolves domain logic (context, role, membership, user rules).
2. Consumer module imports Invite with per-feature config registration.
3. Consumer service calls Invite service methods with `invitationType`.

Important:
- Do **not** resolve invite config inside consumer services.
- Configure once at module load via `forFeature` or `forFeatureAsync`.

## Feature Registration Examples

### Async registration (Project)

```ts
InviteModule.forFeatureAsync({
  invitationType: ProjectInvitationType,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    expiredInMinutes: configService.getOrThrow<number>('invite.expiredInMinutes'),
    linkBaseUrl: configService.getOrThrow<string>('invite.linkBaseUrl'),
  }),
});
```

### Async registration (Tenant)

```ts
InviteModule.forFeatureAsync({
  invitationType: TenantInvitationType,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    resendInMinutes: configService.getOrThrow<number>('invite.resendInMinutes'),
    reference: {
      prefix: configService.getOrThrow<string>('invite.reference.prefix'),
    },
  }),
});
```

### Sync registration

```ts
InviteModule.forFeature({
  invitationType: 'customMemberInvite',
  config: {
    linkBaseUrl: 'custom-invite',
    resendInMinutes: 10,
  },
});
```

## Runtime Failure Semantics

Invite config registration fails fast when:
1. configuration is invalid (validation error), or
2. same `invitationType` is registered more than once.

Invite service execution fails fast when:
1. `invitationType` is not registered in `InviteConfigRegistry`.
   - Error message:
   - `Invite config not registered for "<invitationType>"`

## Design Guidelines

- Keep Invite module domain-neutral and reusable.
- Keep project/tenant/domain-specific lookup logic in consumer modules.
- Register invite config at module import time.
- Keep `invitationType` constants near each consumer domain.

## Important Notes

1. `forRoot()` initializes the module and shared dependencies.
2. Each invitation flow still requires its own `forFeature*` config registration.
3. `forFeature*` registers configuration only; it does not register domain lookup providers.
4. Missing feature registration is treated as configuration error at runtime.


<!-- REFERENCES -->

[ref-doc-configuration]: ./configuration.md
[ref-doc-project]: ./project.md
[ref-doc-tenant]: ./tenant.md
[ref-doc-auth]: ./authentication.md
