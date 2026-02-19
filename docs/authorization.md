# Authorization Documentation

This documentation explains the features and usage of:
- **UserProtected**: Located at `src/modules/user/decorators`
- **RoleProtected**: Located at `src/modules/role/decorators`
- **Authorize**: Located at `src/modules/policy/decorators`
- **TermPolicyAcceptanceProtected**: Located at `src/modules/term-policy/decorators`

## Overview

This document describes the authorization architecture used by the ACK NestJS Boilerplate.

The authorization model is layered and fail-closed:
1. **Authentication layer** validates JWT/API key and populates request identity.
2. **User layer** resolves the user from database and validates account state.
3. **Role layer** validates coarse role access and loads raw role abilities.
4. **Policy layer (CASL)** validates fine-grained permissions with support for allow/deny, conditions, field-level permissions, and rule priority.
5. **Term policy layer** optionally enforces required legal-consent acceptance.

The system is implemented with NestJS decorators + guards and CASL ability evaluation.

## Related Documents

- [Authentication Documentation][ref-doc-authentication] - JWT, API key, and request identity population
- [Term Policy Document][ref-doc-term-policy] - Legal-consent model and acceptance enforcement
- [Tenant + Project Authorization Composition Documentation][ref-doc-tenant-project-authorization] - Tenant/project authorization composition patterns

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Authorization Layers](#authorization-layers)
  - [Layer Order](#layer-order)
  - [Request Context Contract](#request-context-contract)
- [User Protected](#user-protected)
  - [Decorator](#decorator)
  - [Guard Behavior](#guard-behavior)
  - [Usage](#usage)
- [Role Protected](#role-protected)
  - [Decorator](#decorator-1)
  - [Guard Behavior](#guard-behavior-1)
  - [Super Admin Behavior](#super-admin-behavior)
  - [Usage](#usage-1)
- [Authorize (CASL Policy Layer)](#authorize-casl-policy-layer)
  - [Decorator Signatures](#decorator-signatures)
  - [Rule Model](#rule-model)
  - [Requirement Model](#requirement-model)
  - [Rule Ordering and Conflict Resolution](#rule-ordering-and-conflict-resolution)
  - [Guard and Service Behavior](#guard-and-service-behavior)
  - [Usage](#usage-2)
- [TermPolicyAcceptanceProtected](#termpolicyacceptanceprotected)
  - [Decorator](#decorator-2)
  - [Guard Behavior](#guard-behavior-2)
  - [Usage](#usage-3)
- [End-to-End Flow](#end-to-end-flow)
- [Role Ability Storage and Management](#role-ability-storage-and-management)
  - [API Payload Shape](#api-payload-shape)
  - [Prisma Storage Shape](#prisma-storage-shape)
  - [Super Admin Seed Requirement](#super-admin-seed-requirement)
- [Migration Guide](#migration-guide)
  - [Decorator Migration](#decorator-migration)
  - [Role Data Migration](#role-data-migration)
- [Error Behavior](#error-behavior)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Authorization Layers

### Layer Order

For protected admin endpoints, the common stack is:

```typescript
@TermPolicyAcceptanceProtected()
@Authorize(...)
@RoleProtected(...)
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected() // optional, based on endpoint type
```

This order is used by current admin controllers.

### Request Context Contract

Authorization guards communicate through request-scoped fields in `IRequestApp` (`src/common/request/interfaces/request.interface.ts`):

- `request.user`: JWT payload set by authentication guard
- `request.__user`: full user entity loaded by `UserGuard`
- `request.__abilities`: raw role abilities set by `RoleGuard`
- `request.__policyAbilities`: compiled CASL ability cached by `PolicyService`

## User Protected

`UserProtected` ensures a valid authenticated user context exists and enforces user-account state checks.

### Decorator

Location: `src/modules/user/decorators/user.decorator.ts`

```typescript
@UserProtected()
@UserProtected(false)
```

Parameters:
- `isVerified` (`boolean`, default `true`): requires `user.isVerified === true` when enabled.

### Guard Behavior

Guard: `UserGuard` (`src/modules/user/guards/user.guard.ts`)

`UserGuard` calls `UserService.validateUserGuard(...)`, which validates:
1. `request.user` exists
2. user exists in database
3. user status is `active`
4. password is not expired
5. if required, email is verified

On success, guard stores user in `request.__user`.

### Usage

```typescript
@UserProtected()
@AuthJwtAccessProtected()
@Get('/profile')
async profile(@UserCurrent() user: IUser) {
    return user;
}
```

## Role Protected

`RoleProtected` enforces role-type access and loads role abilities for downstream policy evaluation.

### Decorator

Location: `src/modules/role/decorators/role.decorator.ts`

```typescript
@RoleProtected(EnumRoleType.admin)
@RoleProtected(EnumRoleType.admin, EnumRoleType.superAdmin)
```

### Guard Behavior

Guard: `RoleGuard` (`src/modules/role/guards/role.guard.ts`)

Behavior:
1. Reads required roles from metadata (`getAllAndOverride`), so method metadata overrides class metadata.
2. Calls `RoleService.validateRoleGuard(...)`.
3. On success, writes role abilities to `request.__abilities`.

### Super Admin Behavior

`RoleService.validateRoleGuard(...)` allows `superAdmin` to pass role-type checks even when not listed in `requiredRoles`.

Important:
- This is **role-layer bypass only**.
- Policy-layer access is still evaluated by `Authorize` from abilities loaded from role data.

### Usage

```typescript
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Get('/admin-only')
async adminEndpoint() {
    return { ok: true };
}
```

## Authorize (CASL Policy Layer)

`Authorize` enforces fine-grained authorization through CASL abilities.

Location: `src/modules/policy/decorators/policy.decorator.ts`

### Decorator Signatures

`Authorize` supports two input styles:

1. **Rule list (implicit `match: all`)**

```typescript
@Authorize(
    { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
    { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] }
)
```

2. **Structured requirements**

```typescript
@Authorize({
    match: EnumPolicyMatch.any,
    rules: [
        { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
        { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] },
    ],
})
```

### Rule Model

Rule DTO: `RoleAbilityRequestDto` (`src/modules/role/dtos/request/role.ability.request.dto.ts`)

Fields:
- `subject: EnumPolicySubject`
- `action: EnumPolicyAction[]`
- `effect?: EnumPolicyEffect` (`can` | `cannot`, default: `can`)
- `fields?: string[]` (field-level permission)
- `conditions?: Record<string, unknown>` (CASL Mongo-like conditions)
- `reason?: string` (human-readable rule reason)
- `priority?: number` (lower evaluated first)

### Requirement Model

Requirement interface: `IPolicyRequirement` (`src/modules/policy/interfaces/policy.interface.ts`)

Fields:
- `rules: RoleAbilityRequestDto[]`
- `match?: EnumPolicyMatch` (`all` | `any`, default: `all`)
- `resource?: object | (request) => object` (optional subject instance for condition/field-aware checks)

### Rule Ordering and Conflict Resolution

`PolicyAbilityFactory` sorts rules before building ability:
1. `priority` ascending
2. for same priority: `can` first, `cannot` last

This ensures deterministic behavior when allow and deny overlap.

### Guard and Service Behavior

Guard: `PolicyAbilityGuard` (`src/modules/policy/guards/policy.ability.guard.ts`)

Service: `PolicyService.authorize(...)` (`src/modules/policy/services/policy.service.ts`)

Behavior summary:
1. Reads authorization metadata with `getAllAndOverride`.
2. Fails if no requirements are defined (`predefinedNotFound`).
3. Requires authenticated user context (`request.user` + `request.__user`).
4. Builds CASL ability from `request.__abilities` or fallback role abilities.
5. Caches ability in `request.__policyAbilities` for request reuse.
6. Evaluates each requirement using `all` or `any` semantics.
7. Throws forbidden when any required check fails.

### Usage

#### Basic allow rule

```typescript
@Authorize({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read],
})
```

#### Explicit deny rule

```typescript
@Authorize({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.delete],
    effect: EnumPolicyEffect.cannot,
})
```

#### Field-level rule

```typescript
@Authorize({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.update],
    fields: ['name', 'photo'],
})
```

#### Requirement-level OR (`any`)

```typescript
@Authorize({
    match: EnumPolicyMatch.any,
    rules: [
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.role,
            action: [EnumPolicyAction.read],
        },
    ],
})
```

## TermPolicyAcceptanceProtected

`TermPolicyAcceptanceProtected` enforces legal-consent acceptance checks.

### Decorator

Location: `src/modules/term-policy/decorators/term-policy.decorator.ts`

```typescript
@TermPolicyAcceptanceProtected()
@TermPolicyAcceptanceProtected(EnumTermPolicyType.cookies)
```

### Guard Behavior

Guard: `TermPolicyGuard` (`src/modules/term-policy/guards/term-policy.guard.ts`)

Service: `TermPolicyService.validateTermPolicyGuard(...)`

Behavior:
1. Requires `request.user` and `request.__user`
2. Uses provided required policy list
3. If no list is provided, defaults to:
   - `termsOfService`
   - `privacy`
4. Denies access when any required policy is not accepted

### Usage

```typescript
@TermPolicyAcceptanceProtected()
@UserProtected()
@AuthJwtAccessProtected()
@Get('/restricted')
async restricted() {
    return { ok: true };
}
```

## End-to-End Flow

```mermaid
flowchart TD
    A[Request Received] --> B[@AuthJwtAccessProtected]
    B --> C[@UserProtected]
    C --> D[@RoleProtected]
    D --> E[@Authorize]
    E --> F[@TermPolicyAcceptanceProtected]
    F --> G[Controller Handler]

    C --> C1[request.__user loaded]
    D --> D1[request.__abilities loaded]
    E --> E1[request.__policyAbilities compiled and cached]

    B -. missing/invalid token .-> X[Unauthorized/Forbidden]
    C -. user inactive/unverified/password expired .-> X
    D -. role mismatch .-> X
    E -. ability check failed .-> X
    F -. required term policy not accepted .-> X
```

## Role Ability Storage and Management

### API Payload Shape

Role create/update endpoints accept ability arrays using `RoleAbilityRequestDto`.

Example payload:

```json
{
  "name": "auditor",
  "description": "Read-only auditing role",
  "type": "admin",
  "abilities": [
    {
      "subject": "activityLog",
      "action": ["read"],
      "effect": "can",
      "priority": 0
    },
    {
      "subject": "user",
      "action": ["delete"],
      "effect": "cannot",
      "reason": "Auditors cannot delete users",
      "priority": 10
    }
  ]
}
```

### Prisma Storage Shape

`RoleAbility` in `prisma/schema.prisma` stores:
- `action String[]`
- `subject String`
- `effect String?`
- `fields Json?`
- `conditions Json?`
- `reason String?`
- `priority Int?`

### Super Admin Seed Requirement

Because policy checks no longer use hardcoded super-admin bypass, super-admin must have explicit policy abilities.

Current seed data sets super-admin with:
- `subject: all`
- `action: [manage]`

See `src/migration/data/migration.role.data.ts`.

## Migration Guide

### Decorator Migration

Old style:

```typescript
@PolicyAbilityProtected({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read],
})
```

New style:

```typescript
@Authorize({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read],
})
```

### Role Data Migration

For existing environments, reseed roles to ensure baseline roles (including super-admin) carry correct abilities:

```bash
node dist/migration.js role --type seed
```

## Error Behavior

Policy-related error codes are defined in `src/modules/policy/enums/policy.status-code.enum.ts`:

- `forbidden` (`5180`): permission check failed
- `predefinedNotFound` (`5182`): route has missing/empty authorization definition

Common failure classes:
- `ForbiddenException` for access denied
- `InternalServerErrorException` for invalid/missing route policy configuration

## Best Practices

1. Keep `Authorize` close to controller intent: one requirement per business permission.
2. Use `cannot` for explicit deny constraints; do not rely only on missing allow rules.
3. Add `priority` when rule overlap is expected.
4. Use `fields` for partial update/read permissions.
5. Keep `conditions` simple and testable; avoid deeply nested dynamic structures.
6. Always combine `Authorize` with `UserProtected` and `AuthJwtAccessProtected`.
7. For admin endpoints, keep `RoleProtected` as a coarse gate and `Authorize` as a fine gate.

## Troubleshooting

### 1) `policy.error.predefinedNotFound`

Cause:
- `@Authorize` missing on a route that uses policy guard stack, or empty rules provided.

Fix:
- Add valid `@Authorize(...)` metadata with at least one rule.

### 2) User can pass role check but still gets policy forbidden

Cause:
- Role type is allowed (`RoleProtected`), but role ability set does not include required policy rule.

Fix:
- Update role abilities via role admin API, then retry.

### 3) Super admin receives policy forbidden

Cause:
- Super-admin role missing `manage all` (or equivalent) rule data.

Fix:
- Reseed/update role abilities for super-admin.

### 4) Condition rule does not match expected resource

Cause:
- Policy evaluated without the expected subject instance data.

Fix:
- Use structured `IPolicyRequirement` with `resource` resolver when endpoint needs instance-level checks.


<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-authorization]: authorization.md
[ref-doc-tenant-project-authorization]: tenant-project-authorization.md
