# Authorization Documentation

This documentation explains the features and usage of:
- **UserProtected**: Located at `src/modules/user/decorators`
- **RoleProtected**: Located at `src/modules/role/decorators`
- **PolicyAbilityProtected**: Located at `src/modules/policy/decorators`
- **TermPolicyAcceptanceProtected**: Located at `src/modules/term-policy/decorators`

## Overview

This document describes the authorization architecture used by the ACK NestJS Boilerplate.

The authorization model is layered and fail-closed:
1. **Authentication layer** validates JWT/API key and populates request identity.
2. **User layer** resolves the user from database and validates account state.
3. **Role layer** validates coarse role access and loads raw role abilities.
4. **Policy layer (CASL)** validates fine-grained permissions with support for allow/deny, conditions, field-level permissions, and rule priority.
5. **Term policy layer** optionally enforces required legal-consent acceptance.

The system is implemented with NestJS decorators + guards, using `@casl/ability` for runtime permission checks and `@casl/prisma` for query-level authorization via `accessibleBy`.

## Implementation Status (Current Branch)

This branch introduces the CASL authorization infrastructure, but the first concrete module rollout is intentionally limited.

Current first implementation scope:
- `src/modules/activity-log/controllers/activity-log.shared.controller.ts`
- `src/modules/activity-log/docs/activity-log.admin.doc.ts`
- `src/modules/activity-log/services/activity-log.service.ts`

In this scope, the controller declares policy requirements, receives compiled ability via `@PolicyAbilityCurrent()`, and the service applies `accessibleBy(...)` filters in Prisma queries.

## Related Documents

- [Authentication Documentation][ref-doc-authentication] - JWT, API key, and request identity population
- [Term Policy Document][ref-doc-term-policy] - Legal-consent model and acceptance enforcement
- [Tenant + Project Authorization Composition Documentation][ref-doc-tenant-project-authorization] - Tenant/project authorization composition patterns
- [CASL Documentation][ref-casl-docs] - Core concepts, ability rules, conditions, and field-level checks
- [@casl/prisma Package][ref-casl-prisma-docs] - Prisma integration and `accessibleBy` query filtering

## Table of Contents

- [Overview](#overview)
- [Implementation Status (Current Branch)](#implementation-status-current-branch)
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
- [PolicyAbilityProtected (CASL Policy Layer)](#policyabilityprotected-casl-policy-layer)
  - [Decorator Signatures](#decorator-signatures)
  - [Rule Model](#rule-model)
  - [Requirement Model](#requirement-model)
  - [Field-Level Permissions](#field-level-permissions)
  - [Condition-Based Permissions](#condition-based-permissions)
  - [Rule Ordering and Conflict Resolution](#rule-ordering-and-conflict-resolution)
  - [Guard and Service Behavior](#guard-and-service-behavior)
  - [Usage](#usage-2)
- [TermPolicyAcceptanceProtected](#termpolicyacceptanceprotected)
  - [Decorator](#decorator-2)
  - [Guard Behavior](#guard-behavior-2)
  - [Usage](#usage-3)
- [End-to-End Flow](#end-to-end-flow)
- [Complete Examples](#complete-examples)
  - [Example 1 — Field-Level Permissions](#example-1--field-level-permissions)
  - [Example 2 — Condition-Based Permissions](#example-2--condition-based-permissions)
  - [Example 3 — Static `rule.conditions` (Known Resource Shape)](#example-3--static-ruleconditions-known-resource-shape)
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
@PolicyAbilityProtected(...)
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
- `request.__abilities`: role abilities (as `IPolicyAbilityInput[]`) set by `RoleGuard`
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
3. On success, writes role abilities to `request.__abilities` as `IPolicyAbilityInput[]`.

### Super Admin Behavior

`RoleService.validateRoleGuard(...)` allows `superAdmin` to pass role-type checks even when not listed in `requiredRoles`.

Important:
- This is **role-layer bypass only**.
- Policy-layer access is still evaluated by `PolicyAbilityProtected` from abilities loaded from role data.

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

## PolicyAbilityProtected (CASL Policy Layer)

`PolicyAbilityProtected` enforces fine-grained authorization through CASL abilities.

Location: `src/modules/policy/decorators/policy.decorator.ts`

### Decorator Signatures

`PolicyAbilityProtected` supports two input styles:

1. **Rule list (implicit `match: all`)**

```typescript
@PolicyAbilityProtected(
    { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
    { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] }
)
```

2. **Structured requirements**

```typescript
@PolicyAbilityProtected({
    match: EnumPolicyMatch.any,
    rules: [
        { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
        { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] },
    ],
})
```

At least one argument is required. Passing zero arguments is a compile-time error.
Do not mix rule-style and requirement-style arguments in the same decorator call; mixed input is rejected as invalid configuration.

### Rule Model

The decorator accepts `IPolicyRule` objects (`src/modules/policy/interfaces/policy.interface.ts`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | `EnumPolicySubject` | Yes | The resource type to check against |
| `action` | `EnumPolicyAction[]` | Yes | One or more actions required (all must pass) |
| `fields` | `string[]` | No | Restrict check to specific fields (see [Field-Level Permissions](#field-level-permissions)) |
| `conditions` | `PrismaQuery` | No | Static route-side Prisma filter shape. When provided, the guard evaluates `can(action, subject(subjectName, conditions))` |

> Note: `effect`, `reason`, and `priority` are storage-level fields used when defining role abilities in the database. They are not part of route requirements — routes only declare what capability is needed, not how it was granted.
>
> Subject values follow `EnumPolicySubject` and use Prisma model casing (for example: `User`, `Role`, `ActivityLog`).

### Requirement Model

Requirement interface: `IPolicyRequirement` (`src/modules/policy/interfaces/policy.interface.ts`)

Fields:
- `rules: IPolicyRule[]`
- `match?: EnumPolicyMatch` (`all` | `any`, default: `all`)

### Ownership Clamping for Shared Endpoints

For shared/self-service endpoints (for example, "my activity logs"), do not rely only on role ability conditions to enforce ownership.
Use both:
- `accessibleBy(ability)` for policy semantics
- explicit owner clamp in query (`{ userId: currentUserId }`) for endpoint intent clarity

Why this is better:
- Readability: ownership intent is visible directly in the service query.
- Safety: accidental policy/seed misconfiguration is less likely to expose cross-user data.
- Defense-in-depth: data scope is enforced by both authorization and query ownership.

Example (recommended):

```typescript
where: {
  AND: [
    accessibleBy(ability).ActivityLog,
    pagination.where,
    { userId: currentUserId },
  ].filter(Boolean),
}
```

When to apply this pattern:
- Shared endpoints returning user-owned rows ("my data").
- Owner ID is deterministic from auth context (e.g. JWT `userId`).
- Endpoint semantics are explicitly self-scoped.

When not to apply this pattern:
- Admin/system endpoints intentionally reading other users' data.
- Endpoints where scope is intentionally broader and not single-owner.
- Flows where ownership is not a direct FK clamp and must be expressed via richer policy conditions.

Decision checklist:
1. Is this endpoint serving "my own data"?
2. Can ownership be expressed as a direct `where` condition?
3. Will explicit owner clamp preserve intended behavior?
4. If yes, keep `accessibleBy` and add explicit owner clamp.

### Field-Level Permissions

`fields` on a rule restricts the check to a subset of fields on the subject. This mirrors how the stored ability was defined.

**Use case**: an endpoint that only reads specific fields of a user.

Route declaration:

```typescript
@PolicyAbilityProtected({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read],
    fields: ['name', 'email'],
})
```

Stored ability that grants this:

```json
{
    "subject": "User",
    "action": ["read"],
    "fields": ["name", "email", "photo"]
}
```

CASL evaluates the check per field — the user must have `read` permission on every field listed in the route rule. If the stored ability covers a superset of the required fields, the check passes.

**Important**: if the route requires fields but the stored ability has no `fields` restriction (it covers all fields), the check also passes — CASL treats a no-field-restriction ability as granting all fields.

### Condition-Based Permissions

There are two route-level condition mechanisms plus one storage-level mechanism.

#### 1. `IPolicyAbilityInput.conditions` (stored ability — DB side)

Defines **when the grant applies**. Registered into the CASL ability object via `buildRule()`.

```json
{ "subject": "User", "action": ["update"], "conditions": { "departmentId": "dept-eng" } }
```

→ "User can update users **where** `departmentId` is `dept-eng`"

#### 2. `IPolicyRule.conditions` (rule — route side, static)

A **compile-time description** of the resource shape this route targets. Used when the developer knows the resource's relevant fields statically without needing to load an entity at runtime.

```typescript
{ subject: EnumPolicySubject.subscription, action: [EnumPolicyAction.create], conditions: { type: 'basic' } }
```

→ "this endpoint creates basic-type subscriptions — check if the caller can create subscriptions of that type"

#### 3. Context token substitution in stored conditions

`PolicyAbilityFactory` resolves `$` string tokens in stored conditions recursively (nested objects/arrays) using request context. Currently supported context:

- `$userId` → authenticated user id

Unknown placeholders are treated as invalid configuration errors.

Example stored ability:

```json
{ "subject": "ActivityLog", "action": ["read"], "conditions": { "userId": "$userId" } }
```

At request time, this becomes:

```json
{ "subject": "ActivityLog", "action": ["read"], "conditions": { "userId": "<authenticated-user-id>" } }
```

#### Choosing the right mechanism

| Need | Use |
|------|-----|
| Assert a known static resource shape at route definition time | `conditions` on `IPolicyRule` |
| Scope data access by authenticated user context | stored ability `conditions` with `$userId` + `accessibleBy(...)` in service/repository |
| No instance-level check needed | omit route `conditions` |

#### Static conditions example

When the resource shape is known at route definition time (no DB load required):

```typescript
// Endpoint that only creates 'basic' subscriptions
@PolicyAbilityProtected({
    rules: [{
        subject: EnumPolicySubject.subscription,
        action: [EnumPolicyAction.create],
        conditions: { type: 'basic' },   // static: route targets basic-type resources
    }],
})
```

Paired with the stored ability:

```json
{ "subject": "Subscription", "action": ["create"], "conditions": { "type": "basic" } }
```

CASL evaluates: `can(create, subject('Subscription', { type: 'basic' }))` — the static object is used as the tagged subject instance.

Without route `conditions`, CASL performs a capability check only. For list/update/delete data access, enforce record-level constraints in Prisma queries with `accessibleBy(...)`.

**Supported condition syntax** (validated at API level):
Use Prisma filter keys such as `equals`, `in`, `lt`, `lte`, `gt`, `gte`, `contains`, and logical combinators like `AND`, `OR`, and `NOT`.

Mongo-style operators (keys starting with `$`, e.g. `$eq`) return a `400 Bad Request` from the role ability API.

### Rule Ordering and Conflict Resolution

`PolicyAbilityFactory` sorts stored rules before building the CASL ability:
1. `priority` ascending (lower numbers applied first)
2. for same priority: `can` first, `cannot` last

This ensures deterministic behavior when allow and deny overlap. Example:

```json
[
    { "subject": "User", "action": ["manage"], "effect": "can", "priority": 0 },
    { "subject": "User", "action": ["delete"], "effect": "cannot", "priority": 10 }
]
```

The `can manage` is applied first; then `cannot delete` overrides it at higher priority — so delete is denied even though `manage` was granted.

### Guard and Service Behavior

Guard: `PolicyAbilityGuard` (`src/modules/policy/guards/policy.ability.guard.ts`)

Service: `PolicyService.validatePolicyGuard(...)` (`src/modules/policy/services/policy.service.ts`)

Behavior summary:
1. Reads authorization metadata with `getAllAndOverride`.
2. Fails if no requirements are defined (`predefinedNotFound`).
3. Requires authenticated user context (`request.user` + `request.__user`).
4. Builds CASL ability from `request.__abilities` (populated by `RoleGuard`) or directly from user role data.
5. Caches compiled ability in `request.__policyAbilities` for request reuse.
6. Evaluates each requirement using `all` or `any` semantics.
7. Throws `ForbiddenException` with failed subject/action details when any required check fails.
8. Query-level filtering is applied by consumers (service/repository) using `@casl/prisma` `accessibleBy(...)` with the resolved ability.

### Usage

#### Basic allow rule

```typescript
@PolicyAbilityProtected({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read],
})
```

#### Multiple required abilities (all must pass)

```typescript
@PolicyAbilityProtected(
    { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
    { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] }
)
```

#### Requirement-level OR (`any`)

```typescript
@PolicyAbilityProtected({
    match: EnumPolicyMatch.any,
    rules: [
        { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
        { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] },
    ],
})
```

#### Field-level rule

```typescript
@PolicyAbilityProtected({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.update],
    fields: ['name', 'photo'],
})
```

#### Query-level authorization (`@casl/prisma`)

For list/update/delete endpoints, inject the compiled request ability with `@PolicyAbilityCurrent()` and apply `accessibleBy(...)` in Prisma filters:

```typescript
@PolicyAbilityProtected({
    subject: EnumPolicySubject.activityLog,
    action: [EnumPolicyAction.read],
})
@Get('/list')
async list(
    @PolicyAbilityCurrent() ability: IPolicyAbilityRule,
    @PaginationCursorQuery() pagination: IPaginationQueryCursorParams
) {
    return this.activityLogService.getListCursor(pagination, ability);
}

// service
const { data, ...others } = await this.activityRepository.findWithPaginationCursor({
    ...pagination,
    where: {
        AND: [
            accessibleBy(ability).ActivityLog,
            pagination.where,
        ].filter(Boolean),
    },
});
```

This pattern prevents controller-level authorization drift and ensures DB operations are scoped to records allowed by CASL.

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
    D --> E[@PolicyAbilityProtected]
    E --> F[@TermPolicyAcceptanceProtected]
    F --> G[Controller Handler]

    C --> C1[request.__user loaded]
    D --> D1[request.__abilities loaded as IPolicyAbilityInput[]]
    E --> E1[request.__policyAbilities compiled and cached]

    B -. missing/invalid token .-> X[Unauthorized/Forbidden]
    C -. user inactive/unverified/password expired .-> X
    D -. role mismatch .-> X
    E -. ability check failed .-> X
    F -. required term policy not accepted .-> X
```

## Complete Examples

These two end-to-end walkthroughs show how to wire `fields` and `conditions` through the full stack: role ability configuration → controller → service → repository. Use them as a template when adding the policy layer to a new or existing module.

---

### Example 1 — Field-Level Permissions

**Scenario**: An "auditor" admin role may list users, but it must only see non-sensitive fields (`name`, `email`, `status`). It must never receive `passwordHash` or two-factor secrets.

#### Step 1 — Configure the role ability via API

`PUT /v1/role/update/:roleId`

```json
{
  "abilities": [
    {
      "subject": "User",
      "action": ["read"],
      "effect": "can",
      "fields": ["name", "email", "status"],
      "reason": "Auditors see only non-sensitive user fields"
    }
  ]
}
```

CASL will allow `read` on `User` only for the listed fields. Any attempt to check a field not in this list (e.g. `passwordHash`) is denied by CASL automatically.

#### Step 2 — Define a scoped response DTO

Create a DTO that only exposes the allowed fields so the response is structurally enforced as well:

```typescript
// src/modules/user/dtos/response/user.auditor.response.dto.ts
export class UserAuditorResponseDto {
    name: string;
    email: string;
    status: EnumUserStatus;
}
```

#### Step 3 — Repository: fetch only the required fields

Select only the columns that are allowed. This keeps the database query minimal and avoids loading secrets that would then need stripping:

```typescript
// src/modules/user/repositories/user.repository.ts
async findAuditorList(
    pagination: IPaginationQueryOffsetParams
): Promise<{ data: UserAuditorResponseDto[]; total: number }> {
    const { page, perPage } = pagination;

    const [data, total] = await Promise.all([
        this.databaseService.user.findMany({
            select: { name: true, email: true, status: true },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        this.databaseService.user.count(),
    ]);

    return { data, total };
}
```

#### Step 4 — Service: delegate to the scoped repository method

```typescript
// src/modules/user/services/user.service.ts
async getAuditorList(
    pagination: IPaginationQueryOffsetParams
): Promise<IResponsePagingReturn<UserAuditorResponseDto>> {
    const { data, total } = await this.userRepository.findAuditorList(pagination);

    return {
        data: plainToInstance(UserAuditorResponseDto, data),
        total,
        page: pagination.page,
        perPage: pagination.perPage,
    };
}
```

#### Step 5 — Controller: declare the field-level rule

The `fields` array on the route rule tells `PolicyService` exactly which fields to verify. If the caller's stored ability does not cover all listed fields, the request is rejected with `403`:

```typescript
// src/modules/user/controllers/user.admin.controller.ts
@ResponsePaging('user.auditorList')
@TermPolicyAcceptanceProtected()
@PolicyAbilityProtected({
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read],
    fields: ['name', 'email', 'status'],   // ← must all be in the stored ability's fields
})
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@Get('/list/auditor')
async auditorList(
    @PaginationOffsetQuery() pagination: IPaginationQueryOffsetParams
): Promise<IResponsePagingReturn<UserAuditorResponseDto>> {
    return this.userService.getAuditorList(pagination);
}
```

#### How CASL evaluates the check

```
stored ability: can read User [name, email, status]
route rule:     read User [name, email, status]

CASL checks: can(read, User, "name")   → ✓
             can(read, User, "email")  → ✓
             can(read, User, "status") → ✓
             all pass → request allowed
```

If the auditor role's ability only included `["name", "email"]`, the check for `"status"` would fail and the request would be rejected.

> **Important**: the guard controls *access* to the endpoint; it does not filter the response automatically. Use a scoped response DTO and a scoped repository query (steps 2–4) to ensure the response structurally matches the permitted fields.

---

### Example 2 — Condition-Based Permissions

**Scenario**: users can read only their own activity logs. The role ability uses a context token (`$userId`) and the service enforces data-level scope with `accessibleBy(...)`.

#### Step 1 — Configure the role ability via API

`PUT /v1/role/update/:roleId`

```json
{
  "abilities": [
    {
      "subject": "ActivityLog",
      "action": ["read"],
      "effect": "can",
      "conditions": { "userId": "$userId" },
      "reason": "Users can only read their own activity logs"
    }
  ]
}
```

`PolicyAbilityFactory.createForUser(...)` resolves `$userId` from the authenticated request context before evaluating permissions.

#### Step 2 — Controller: declare requirement and inject compiled ability

```typescript
// src/modules/activity-log/controllers/activity-log.shared.controller.ts
@PolicyAbilityProtected({
    subject: EnumPolicySubject.activityLog,
    action: [EnumPolicyAction.read],
})
@Get('/list')
async list(
    @PolicyAbilityCurrent() ability: IPolicyAbilityRule,
    @PaginationCursorQuery() pagination: IPaginationQueryCursorParams
) {
    return this.activityLogService.getListCursor(pagination, ability);
}
```

#### Step 3 — Service: enforce Prisma-level scope with `accessibleBy(...)`

```typescript
// src/modules/activity-log/services/activity-log.service.ts
const { data, ...others } = await this.activityRepository.findWithPaginationCursor({
    ...pagination,
    where: {
        AND: [
            accessibleBy(ability).ActivityLog,
            pagination.where,
        ].filter(Boolean),
    },
});
```

#### Step 4 — Admin doc guard alignment

```typescript
// src/modules/activity-log/docs/activity-log.admin.doc.ts
DocGuard({ role: true, policy: true, termPolicy: true })
```

#### How CASL evaluates the condition

```
stored ability condition:  { "userId": "$userId" }
resolved at runtime:       { "userId": "<authenticated-user-id>" }

Prisma filter applied:     accessibleBy(ability).ActivityLog
result:                    only rows matching the resolved `userId` can be returned
```

---

### Example 3 — Static `rule.conditions` (Known Resource Shape)

**Scenario**: A subscription platform exposes separate endpoints for creating "basic" vs "premium" subscriptions. Each endpoint should only be accessible to roles whose stored ability explicitly permits that subscription type — no entity needs to be loaded from the DB.

#### Step 1 — Configure the role ability via API

`PUT /v1/role/update/:roleId`

```json
{
  "abilities": [
    {
      "subject": "Subscription",
      "action": ["create"],
      "effect": "can",
      "conditions": { "type": "basic" },
      "reason": "Role may only create basic subscriptions"
    }
  ]
}
```

#### Step 2 — Controller: declare the static conditions on the rule

```typescript
// src/modules/subscription/controllers/subscription.admin.controller.ts
@Response('subscription.create')
@PolicyAbilityProtected({
    rules: [{
        subject: EnumPolicySubject.subscription,
        action: [EnumPolicyAction.create],
        conditions: { type: 'basic' },   // static shape — no runtime entity needed
    }],
})
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@Post('/create/basic')
async createBasic(
    @Body() body: SubscriptionCreateBasicRequestDto
): Promise<IResponseReturn<void>> {
    return this.subscriptionService.createBasic(body);
}
```

#### How CASL evaluates the check

```
stored ability conditions: { "type": "basic" }
rule.conditions:           { "type": "basic" }   ← used as synthetic subject

CASL checks: can(create, subject('Subscription', { type: 'basic' }))
             "basic" === "basic" → ✓ → request allowed
```

A role whose stored ability has `{ "type": "premium" }` would fail this check and receive `403`.

---

## Role Ability Storage and Management

### API Payload Shape

Role create/update endpoints accept ability arrays using `RoleAbilityRequestDto` (`src/modules/role/dtos/request/role.ability.request.dto.ts`).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | `EnumPolicySubject` | Yes | Resource type |
| `action` | `EnumPolicyAction[]` | Yes | Allowed/denied actions |
| `effect` | `EnumPolicyEffect` | No | `can` (default) or `cannot` |
| `fields` | `string[]` | No | Restrict to specific fields |
| `conditions` | `Record<string, unknown>` | No | Prisma-style condition filter |
| `reason` | `string` | No | Human-readable note for the rule |
| `priority` | `number` | No | Evaluation order (lower first, default: `0`) |

Example payload:

```json
{
  "name": "auditor",
  "description": "Read-only auditing role",
  "type": "admin",
  "abilities": [
    {
      "subject": "ActivityLog",
      "action": ["read"],
      "effect": "can",
      "priority": 0
    },
    {
      "subject": "User",
      "action": ["delete"],
      "effect": "cannot",
      "reason": "Auditors cannot delete users",
      "priority": 10
    },
    {
      "subject": "User",
      "action": ["read"],
      "fields": ["name", "email"],
      "reason": "Read-only access to non-sensitive user fields"
    },
    {
      "subject": "ActivityLog",
      "action": ["read"],
      "conditions": { "userId": "$userId" },
      "reason": "Users can only read their own activity logs"
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

The decorator was previously named `Authorize`. It has been renamed to `PolicyAbilityProtected` to match the naming convention of the other authorization decorators in this stack.

### Role Data Migration

For existing environments, reseed roles to ensure baseline roles (including super-admin) carry correct abilities:

```bash
node dist/migration.js role --type seed
```

## Error Behavior

Policy-related error codes are defined in `src/modules/policy/enums/policy.status-code.enum.ts`:

- `forbidden` (`5180`): permission check failed — response includes `errors` array with failed subject/action pairs
- `predefinedNotFound` (`5182`): route has missing/empty authorization definition

Common failure classes:
- `ForbiddenException` for access denied
- `InternalServerErrorException` for invalid/missing route policy configuration

## Best Practices

1. Keep `PolicyAbilityProtected` close to controller intent: one requirement per business permission.
2. Use `cannot` stored abilities for explicit deny constraints; do not rely only on missing allow rules.
3. Add `priority` when rule overlap is expected.
4. Use `fields` on stored abilities for partial read/update permissions; mirror the same `fields` on the route rule when you want the guard to validate field access.
5. Use `conditions` on stored abilities for scoped access (for example, `{ "userId": "$userId" }` for owner-scoped resources).
6. Keep `conditions` simple and testable; token substitution currently supports top-level string values only.
7. Always combine `PolicyAbilityProtected` with `UserProtected` and `AuthJwtAccessProtected`.
8. For admin endpoints, keep `RoleProtected` as a coarse gate and `PolicyAbilityProtected` as a fine gate.
9. For read/update/delete data access, pass `@PolicyAbilityCurrent()` ability to the service layer and apply `accessibleBy(ability)` in repository queries.

## Troubleshooting

### 1) `policy.error.predefinedNotFound`

Cause:
- `@PolicyAbilityProtected` missing on a route that uses policy guard stack, or empty rules provided.

Fix:
- Add valid `@PolicyAbilityProtected(...)` metadata with at least one rule.

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

### 4) Condition rule appears ignored in data listing

Cause:
- Route-level capability check passed, but data query did not apply `accessibleBy(...)`.

Fix:
- Inject `@PolicyAbilityCurrent()` into the controller method and enforce Prisma `where` constraints with `accessibleBy(ability)` in service/repository.

### 5) Role ability API returns 400 on `conditions`

Cause:
- `conditions` object uses Mongo-style operators (e.g. `$eq`, `$or`) or an invalid shape.

Fix:
- Use Prisma filter syntax (e.g. `equals`, `in`, `lt`, `AND`, `OR`, `NOT`) and avoid keys prefixed with `$`.


<!-- REFERENCES -->

[ref-doc-authentication]: authentication.md
[ref-doc-term-policy]: term-policy.md
[ref-casl-docs]: https://casl.js.org/
[ref-casl-prisma-docs]: https://www.npmjs.com/package/@casl/prisma
