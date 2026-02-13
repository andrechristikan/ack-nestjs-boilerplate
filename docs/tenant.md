# Tenant Documentation

This documentation explains the features and usage of the Multi-Tenant system:
- **TenantProtected**: Located at `src/modules/tenant/decorators`
- **TenantMemberProtected**: Located at `src/modules/tenant/decorators`
- **TenantRoleProtected**: Located at `src/modules/tenant/decorators`
- **TenantPermissionProtected**: Located at `src/modules/tenant/decorators`

## Overview

The tenant system provides multi-tenancy support for SaaS applications where multiple organizations (tenants) share the same application instance while keeping their data isolated. Each tenant can have multiple members with different roles and permissions.

**Key Features:**
- **Tenant Isolation** - Complete data separation between tenants
- **Membership Management** - Users can belong to multiple tenants
- **Role-Based Access** - Tenant-specific roles (tenant-admin, tenant-user)
- **Permission Control** - Fine-grained abilities for tenant operations
- **Context Switching** - Users can switch between their tenant memberships

## Related Documents

- [Authorization Documentation][ref-doc-authorization] - For understanding the permission system
- [Authentication Documentation][ref-doc-authentication] - For understanding the authentication system
- [Database Documentation][ref-doc-database] - For understanding the data model

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [When to Use Multi-Tenancy](#when-to-use-multi-tenancy)
- [Optional Enablement (Disabled by Default)](#optional-enablement-disabled-by-default)
  - [How It Works](#how-it-works)
  - [Enable Multi-Tenancy](#enable-multi-tenancy)
  - [Disable Multi-Tenancy](#disable-multi-tenancy)
- [Architecture](#architecture)
  - [Data Model](#data-model)
  - [Module Split](#module-split)
  - [Request Typing Composition](#request-typing-composition)
  - [Request Flow](#request-flow)
  - [Tenant Context](#tenant-context)
- [Tenant-Scoped Authentication](#tenant-scoped-authentication)
  - [Overview](#tenant-auth-overview)
  - [Login Endpoint](#tenant-login-endpoint)
  - [Authentication Flow](#tenant-authentication-flow)
  - [Response Structure](#tenant-response-structure)
  - [Error Handling](#tenant-error-handling)
- [Tenant Protected](#tenant-protected)
  - [Decorators](#decorators)
    - [TenantProtected() Decorator](#tenantprotected-decorator)
    - [TenantMemberProtected() Decorator](#tenantmemberprotected-decorator)
    - [TenantRoleProtected() Decorator](#tenantroleprotected-decorator)
    - [TenantPermissionProtected() Decorator](#tenantpermissionprotected-decorator)
    - [TenantCurrent Parameter Decorator](#tenantcurrent-parameter-decorator)
    - [TenantMemberCurrent Parameter Decorator](#tenantmembercurrent-parameter-decorator)
  - [Guards](#guards)
    - [TenantGuard](#tenantguard)
    - [TenantMemberGuard](#tenantmemberguard)
    - [TenantRoleGuard](#tenantroleguard)
    - [TenantPermissionGuard](#tenantpermissionguard)
- [Tenant Roles](#tenant-roles)
  - [Built-in Roles](#built-in-roles)
  - [Role Scopes](#role-scopes)
  - [Role Abilities](#role-abilities)
- [REST API Endpoints](#rest-api-endpoints)
  - [Admin Endpoints](#admin-endpoints)
  - [Shared Endpoints](#shared-endpoints)
- [Setup and Migration](#setup-and-migration)
- [Usage Examples](#usage-examples)
  - [Basic Tenant Protection](#basic-tenant-protection)
  - [Member Management](#member-management)
  - [Role-Based Protection](#role-based-protection)
  - [Permission-Based Protection](#permission-based-protection)
- [Important Notes](#important-notes)

## When to Use Multi-Tenancy

Multi-tenancy is ideal for:

✅ **SaaS Applications** - Multiple organizations using the same application (e.g., project management tools, CRM systems)
✅ **B2B Platforms** - Managing multiple clients/organizations with separate workspaces (e.g., consulting platforms, service providers)
✅ **B2B Applications** - Enterprise software with organizational boundaries (e.g., team collaboration tools)
✅ **White-Label Solutions** - Same codebase serving different branded instances
✅ **Marketplace Platforms** - Vendors/sellers managing their own products and orders

❌ **When NOT to use:**
- Simple applications with no organizational boundaries
- Single-organization internal tools
- Applications where users don't belong to organizations

## Optional Enablement (Disabled by Default)

Multi-tenancy is optional and can be disabled by default in platform deployments.

### How It Works

- The toggle is controlled by `TENANCY_ENABLED`.
- Default value is `false`.
- When disabled:
  - Tenant middleware is not applied.
  - Tenant public/shared/admin routes are not registered.
  - Tenant endpoints return `404` because routes are not mounted.
- When enabled:
  - Tenant middleware and routes are mounted as normal.
  - Existing tenant guards/decorators behavior remains unchanged.

### Enable Multi-Tenancy

1. Set `TENANCY_ENABLED=true` in environment configuration.
2. Ensure tenant-related data is seeded/migrated (tenants, tenant roles, memberships as needed).
3. Use tenant login and tenant-scoped APIs.
4. Include `x-tenant-id` header for tenant-scoped requests.

### Disable Multi-Tenancy

1. Set `TENANCY_ENABLED=false`.
2. Restart the service.
3. Tenant routes are removed from the active routing table.
4. Non-tenant modules continue to run normally.

## Architecture

### Data Model

The tenant system uses three main models:

**Models:**
- **`Tenant`** - Represents an organization with name and status
- **`TenantMember`** - Links users to tenants with roles and status (unique per tenant-user combination)
- **`Role`** - Unified role model for both platform and tenant-specific roles with CASL abilities

**Key Points:**
- Users can be members of multiple tenants
- Each membership has its own role and status
- Tenant roles are stored in the main `Role` model alongside platform roles
- Roles are differentiated by `scope` (`platform` or `tenant`)

### Module Split

Tenant code is split for clearer optional wiring:

- **Tenant Core Module**: `src/modules/tenant/tenant.module.ts`
  - Providers/guards/services/repository (no route controllers)
- **Tenant Public Routes Module**: `src/modules/tenant/tenant.routes.public.module.ts`
  - Registers tenant public endpoints when tenancy is enabled
- **Tenant Shared Routes Module**: `src/modules/tenant/tenant.routes.shared.module.ts`
  - Registers tenant shared endpoints and tenant-scoped project endpoints
- **Tenant Admin Routes Module**: `src/modules/tenant/tenant.routes.admin.module.ts`
  - Registers tenant admin endpoints

Toggle utility location:
- `src/modules/tenant/util/tenancy.toggle.ts`

### Request Typing Composition

Request typing is split by module ownership while preserving the same base import:

- Base request interface remains in:
  - `src/common/request/interfaces/request.interface.ts` (`IRequestApp`)
- Tenant-specific request properties are defined in:
  - `src/modules/tenant/interfaces/request.tenant.interface.ts`
- Project-specific request properties are defined in:
  - `src/modules/project/interfaces/request.project.interface.ts`

Tenant and project internals use composed local types (intersection types), for example:
- `IRequestAppWithTenant = IRequestApp & IRequestAppTenant`
- `IRequestAppWithProjectTenant = IRequestApp & IRequestAppProject & IRequestAppTenant`

This keeps common request types domain-agnostic while still supporting strongly typed module-specific request context.

### Request Flow

```
Client Request
    ↓
1. x-tenant-id header → Request Middleware → request.__tenantId
    ↓
2. @TenantProtected() → TenantGuard → Validates tenant exists and is active
    ↓
3. @TenantMemberProtected() → TenantMemberGuard → Validates user is active member
    ↓
4. @TenantRoleProtected() → TenantRoleGuard → Checks role name
    ↓
5. @TenantPermissionProtected() → TenantPermissionGuard → Checks abilities
    ↓
Controller Handler
```

### Tenant Context

The tenant context is established via the `x-tenant-id` header:

```typescript
// Request headers
{
  "Authorization": "Bearer <access_token>",
  "x-tenant-id": "507f1f77bcf86cd799439011"
}

// Request object after middleware
request.__tenantId = "507f1f77bcf86cd799439011"
request.__tenant = { id: "...", name: "Acme Corp", ... }
request.__tenantMember = { id: "...", userId: "...", role: {...} }
```

## Tenant-Scoped Authentication

### Overview {#tenant-auth-overview}

For applications that require tenant membership validation at login time, the system provides a dedicated authentication endpoint. This is useful when you want to:

- **Restrict access** to users who belong to at least one tenant
- **Display tenant selection** immediately after login
- **Enforce organizational boundaries** from the authentication layer
- **Support multi-tenant applications** where users manage organizational resources

**Use Cases:**
- B2B SaaS admin panels where only tenant members can access
- Organizational dashboards requiring tenant membership
- Multi-tenant management applications
- Enterprise applications with strict organizational access control

**Key Features:**
- ✅ Validates tenant membership during authentication
- ✅ Returns list of available tenants in login response
- ✅ Rejects users without any tenant memberships
- ✅ Supports users with multiple tenant memberships
- ✅ Uses standard JWT tokens (no token structure changes)
- ✅ Compatible with existing tenant context system

### Login Endpoint {#tenant-login-endpoint}

**Endpoint:** `POST /api/v1/public/tenant/login/credential`

This endpoint performs standard user authentication plus tenant membership validation.

**Request:**

```typescript
POST /api/v1/public/tenant/login/credential
Content-Type: application/json
X-Api-Key: <your_api_key>

{
  "email": "user@example.com",
  "password": "password123",
  "from": "website" | "mobile"
}
```

**Request Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password (min 8 characters) |
| `from` | enum | Yes | Login source: `website` or `mobile` |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `X-Api-Key` | Yes | API key for request authentication |
| `Content-Type` | Yes | Must be `application/json` |

### Authentication Flow {#tenant-authentication-flow}

Tenant login reuses the standard credential login flow from [Authentication Documentation][ref-doc-authentication], with one tenant-specific validation:

1. Validate credentials using the same rules as `POST /api/v1/public/user/login/credential`.
2. Check active tenant memberships for the authenticated user.
3. Reject login with `403` + `statusCode: 5201` when no active memberships exist.
4. Return standard auth payload plus `tenants[]` for tenant selection.

Implementation reference:
- `src/modules/tenant/services/tenant-auth.service.ts`

### Response Structure {#tenant-response-structure}

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Logged in successfully to tenant application.",
  "data": {
    "isTwoFactorEnable": false,
    "tokens": {
      "accessToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "tenants": [
      {
        "tenantId": "507f1f77bcf86cd799439011",
        "tenantName": "Acme Corporation",
        "role": "tenant-admin",
        "status": "active"
      },
      {
        "tenantId": "507f191e810c19729de860ea",
        "tenantName": "Beta Industries",
        "role": "tenant-user",
        "status": "active"
      }
    ]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `isTwoFactorEnable` | boolean | Whether 2FA verification is required |
| `tokens` | object | Standard auth tokens (same structure as user login) |
| `twoFactor` | object | Standard 2FA challenge data |
| `tenants` | array | List of user's active tenant memberships |
| `tenants[].tenantId` | string | Unique tenant identifier |
| `tenants[].tenantName` | string | Human-readable tenant name |
| `tenants[].role` | string | User's role in this tenant |
| `tenants[].status` | enum | Membership status: `active` or `inactive` |

JWT payload, refresh flow, and 2FA behavior are the same as the standard auth flow. See [Authentication Documentation][ref-doc-authentication].

**Important:** Tenant context is not stored in JWT payloads. Clients must send `x-tenant-id` on tenant-scoped requests.

**Client Implementation Notes:**
1. After successful login, store tokens and tenant list
2. If user has multiple tenants, present a selector UI
3. Store selected tenant ID for subsequent requests
4. Include `x-tenant-id` header in all tenant-scoped API calls
5. Users can switch tenants without re-authentication

### Error Handling {#tenant-error-handling}

Tenant login adds one tenant-specific error:

#### No Tenant Membership (403 Forbidden)

```json
{
  "statusCode": 5201,
  "message": "tenant.error.loginNoMembership",
  "error": "Forbidden"
}
```

**Cause:** User has no active tenant memberships
**Action:** Display message and direct user to contact administrator

All other credential/2FA/auth errors are shared with standard login and documented in [Authentication Documentation][ref-doc-authentication].

**Comparison with Standard User Login:**

| Feature | Standard Login | Tenant Login |
|---------|---------------|--------------|
| **Endpoint** | `/api/v1/public/user/login/credential` | `/api/v1/public/tenant/login/credential` |
| **Validation** | User credentials only | User credentials + tenant membership |
| **Response** | Tokens only | Tokens + tenant list |
| **Access Control** | All active users | Only users with tenant memberships |
| **Use Case** | Consumer applications | B2B/organizational applications |
| **Token Structure** | Standard JWT | Standard JWT (same structure) |
| **Error Code** | N/A | 5201 for no membership |
| **Tenant Context** | Optional (added via header if needed) | Required (via `x-tenant-id` header) |

**When to Use Each:**

- **Standard Login (`/user/login/credential`)**:
  - Consumer-facing applications
  - Applications without organizational boundaries
  - Public user access

- **Tenant Login (`/tenant/login/credential`)**:
  - B2B SaaS applications
  - Organizational management tools
  - Multi-tenant admin panels
  - Enterprise applications

Both endpoints:
- Return the same JWT token structure
- Use the same session management
- Support the same authentication features (2FA, password policies, etc.)
- Can coexist in the same application

## Tenant Protected

### Decorators

#### TenantProtected Decorator

**Method decorator** that validates tenant context via the `x-tenant-id` header.

**What it does:**
- Validates `x-tenant-id` header is present
- Checks if tenant exists in database
- Ensures tenant status is `active`
- Sets `request.__tenant` with tenant data

**Usage:**

```typescript
@TenantProtected()
@Get('info')
getTenantInfo(@TenantCurrent() tenant: ITenant) {
    return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status
    };
}
```

**Error Responses:**
- `400 Bad Request` - Missing `x-tenant-id`
- `404 Not Found` - Tenant does not exist
- `403 Forbidden` - Tenant is inactive

#### TenantMemberProtected Decorator

**Method decorator** that validates the authenticated user is an active member of the tenant.

**What it does:**
- Applies `TenantProtected` first (validates tenant)
- Verifies user authentication
- Checks if user is a member of the tenant
- Ensures membership status is `active`
- Loads member's role
- Sets `request.__tenantMember`

**Usage:**

```typescript
@TenantMemberProtected()
@AuthJwtAccessProtected()
@Get('dashboard')
getMemberDashboard(@TenantMemberCurrent() member: ITenantMember) {
    return {
        memberId: member.id,
        userId: member.userId,
        role: member.role.name,
        tenant: member.tenant.name
    };
}
```

**Error Responses:**
- All `TenantProtected` errors
- `403 Forbidden` - User is not authenticated
- `403 Forbidden` - User is not a member or membership is inactive
- `403 Forbidden` - Member has no role assigned

#### TenantRoleProtected Decorator

**Method decorator** that restricts access to specific tenant role names.

**Parameters:**
- `...requiredRoleNames: string[]` - One or more role names (e.g., `'tenant-admin'`, `'tenant-user'`)

**What it does:**
- Applies `TenantMemberProtected` first
- Checks if member's role name matches any required role
- Throws error if role doesn't match

**Usage:**

Apply `@TenantRoleProtected('tenant-admin')` (or other tenant role name) on handlers that require specific tenant roles. Example:

```typescript
@TenantRoleProtected('tenant-admin')
@UserProtected()
@AuthJwtAccessProtected()
@Patch('members/:memberId')
process(@TenantCurrent() tenant: ITenant) {
    return tenantMemberService.updateMember(tenant.id, ...);
}
```

This mirrors the platform role-based decorators described in `docs/authorization.md` but evaluates tenant-specific role names and context.

**Error Responses:**
- All `TenantMemberProtected` errors
- `403 Forbidden` - Member's role doesn't match required roles
- `500 Internal Server Error` - No required roles configured (developer error)

#### TenantPermissionProtected Decorator

**Method decorator** that checks fine-grained permissions based on CASL abilities.

**Parameters:**
- `...requiredAbilities: RoleAbilityRequestDto[]` - Array of subject-action pairs

**What it does:**
- Applies `TenantMemberProtected` first
- Uses member role abilities from `request.__tenantMember.role.abilities`
- Checks each required ability against member's abilities
- Uses CASL `PolicyAbilityFactory` for permission checks

**Usage:**

Use `@TenantPermissionProtected({ subject: EnumPolicySubject.tenant, action: [EnumPolicyAction.read] })` to gate tenant-level reads, updates, or tenant member operations. Example:

```typescript
@TenantPermissionProtected({
    subject: EnumPolicySubject.tenantMember,
    action: [EnumPolicyAction.create]
})
@UserProtected()
@AuthJwtAccessProtected()
@Post('members')
invite(@TenantCurrent() tenant: ITenant) {
    // Handler assumes the member has the tenantMember:create ability in this tenant
}
```

The permission metadata feeds the same CASL-based check as described in `docs/authorization.md`, scoped to the current `request.__tenantMember`.

**Error Responses:**
- All `TenantMemberProtected` errors
- `403 Forbidden` - Member doesn't have required abilities
- `500 Internal Server Error` - No required abilities configured (developer error)

#### TenantCurrent Parameter Decorator

Extracts the current tenant from the request context.

**Returns:** `ITenant | undefined`

**Usage:**

```typescript
@TenantProtected()
@Get('info')
getTenantInfo(@TenantCurrent() tenant: ITenant) {
    return {
        id: tenant.id,
        name: tenant.name,
        createdAt: tenant.createdAt
    };
}
```

#### TenantMemberCurrent Parameter Decorator

Extracts the current tenant member (with user, tenant, and role) from the request context.

**Returns:** `ITenantMember | undefined`

**Usage:**

```typescript
@TenantMemberProtected()
@AuthJwtAccessProtected()
@Get('profile')
getMemberProfile(@TenantMemberCurrent() member: ITenantMember) {
    return {
        memberId: member.id,
        userId: member.userId,
        tenantId: member.tenantId,
        role: {
            id: member.role.id,
            name: member.role.name,
            abilities: member.role.abilities
        },
        tenant: {
            id: member.tenant.id,
            name: member.tenant.name
        }
    };
}
```

### Guards

#### TenantGuard

**Implementation:** `src/modules/tenant/guards/tenant.guard.ts`

Validates tenant context from `x-tenant-id` header.

**Process:**
1. Extract `request.__tenantId` (set by middleware)
2. Require `x-tenant-id`
3. Query database for tenant
4. Check if tenant exists and is active
5. Set `request.__tenant` with tenant data

**Code:**

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const tenant = await this.tenantService.validateTenantGuard(request);

        request.__tenant = tenant;

        return true;
    }
}
```

#### TenantMemberGuard

**Implementation:** `src/modules/tenant/guards/tenant.member.guard.ts`

Validates that the authenticated user is an active member of the tenant.

**Process:**
1. Validate user authentication
2. Validate tenant context (uses `TenantGuard` logic)
3. Query for active tenant membership
4. Load member's role
5. Set `request.__tenantMember`

**Code:**

```typescript
@Injectable()
export class TenantMemberGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const tenantMember = await this.tenantService.validateTenantMemberGuard(request);

        request.__tenantMember = tenantMember;

        return true;
    }
}
```

#### TenantRoleGuard

**Implementation:** `src/modules/tenant/guards/tenant.role.guard.ts`

Checks if the member's role matches required role names.

**Process:**
1. Extract required role names from decorator metadata
2. Get member's role from `request.__tenantMember`
3. Check if role name is in required list
4. Throw error if not authorized

**Code:**

```typescript
@Injectable()
export class TenantRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantService: TenantService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoleNames = this.reflector.get<string[]>(
            TenantRoleRequiredMetaKey,
            context.getHandler()
        ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();

        return this.tenantService.validateTenantRoleGuard(
            request,
            requiredRoleNames
        );
    }
}
```

#### TenantPermissionGuard

**Implementation:** `src/modules/tenant/guards/tenant.permission.guard.ts`

Checks if the member has required abilities using CASL.

**Process:**
1. Extract required abilities from decorator metadata
2. Get member abilities from `request.__tenantMember.role.abilities`
3. Use `PolicyAbilityFactory` to check permissions
4. Throw error if not authorized

**Code:**

```typescript
@Injectable()
export class TenantPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantService: TenantService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities = this.reflector.get<RoleAbilityRequestDto[]>(
            TenantPermissionRequiredMetaKey,
            context.getHandler()
        ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();

        return this.tenantService.validateTenantPermissionGuard(
            request,
            requiredAbilities
        );
    }
}
```

## Tenant Roles

### Built-in Roles

The tenant system includes predefined roles stored in the main `Role` model:

| Role Name | Description | Use Case |
|-----------|-------------|----------|
| `tenant-admin` | Full tenant management | Manage tenant settings, members, and tenant projects |
| `tenant-user` | Standard tenant member | Read tenant/member data and manage tenant projects |
| `tenant-platform-support` | Temporary JIT support access | Time-limited read access + limited member/project access for platform operators |

### Role Scopes

Roles use an explicit scope:

- `platform` scope: roles for global/system-level authorization (e.g., platform admins)
- `tenant` scope: roles assignable to `TenantMember` records (e.g., `tenant-admin`, `tenant-user`)

Tenant membership operations only accept roles in `tenant` scope.

### Role Abilities

**Tenant Admin Abilities:**

```typescript
{
    name: 'tenant-admin',
    abilities: [
        {
            subject: EnumPolicySubject.tenant,
            action: [EnumPolicyAction.read, EnumPolicyAction.update]
        },
        {
            subject: EnumPolicySubject.tenantMember,
            action: [
                EnumPolicyAction.read,
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete
            ]
        },
        {
            subject: EnumPolicySubject.project,
            action: [
                EnumPolicyAction.create,
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete
            ]
        }
    ]
}
```

**Tenant Platform Support Abilities (JIT):**

```typescript
{
    name: 'tenant-platform-support',
    abilities: [
        {
            subject: EnumPolicySubject.tenant,
            action: [EnumPolicyAction.read]
        },
        {
            subject: EnumPolicySubject.tenantMember,
            action: [EnumPolicyAction.read, EnumPolicyAction.create, EnumPolicyAction.update]
        },
        {
            subject: EnumPolicySubject.project,
            action: [EnumPolicyAction.read]
        }
    ]
}
```

**Tenant User Abilities:**

```typescript
{
    name: 'tenant-user',
    abilities: [
        {
            subject: EnumPolicySubject.tenant,
            action: [EnumPolicyAction.read]
        },
        {
            subject: EnumPolicySubject.tenantMember,
            action: [EnumPolicyAction.read]
        },
        {
            subject: EnumPolicySubject.project,
            action: [
                EnumPolicyAction.create,
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete
            ]
        }
    ]
}
```

**Available Policy Subjects:**
- `EnumPolicySubject.tenant` - Tenant resource operations
- `EnumPolicySubject.tenantMember` - Member management operations
- `EnumPolicySubject.project` - Project operations in tenant scope

**Available Policy Actions:**
- `EnumPolicyAction.read` - View/retrieve data
- `EnumPolicyAction.create` - Create new resources
- `EnumPolicyAction.update` - Modify existing resources
- `EnumPolicyAction.delete` - Delete/deactivate resources

## REST API Endpoints

### Public Endpoints

Base path: `/api/v1/public/tenant`

**Tenant-scoped authentication** (no authentication required):

```typescript
// Login with tenant membership validation
POST /api/v1/public/tenant/login/credential
X-Api-Key: <api_key>
Body: {
    email: "user@example.com",
    password: "password123",
    from: "website" | "mobile"
}
Response: {
    statusCode: 200,
    message: "Logged in successfully to tenant application.",
    data: {
        isTwoFactorEnable: false,
        tokens: {
            accessToken: "...",
            refreshToken: "..."
        },
        tenants: [
            {
                tenantId: "...",
                tenantName: "Acme Corp",
                role: "tenant-admin",
                status: "active"
            }
        ]
    }
}

// Error: No tenant membership (403 Forbidden)
Response: {
    statusCode: 5201,
    message: "tenant.error.loginNoMembership"
}
```

**Key Differences from Standard Login:**
- Validates user has at least one active tenant membership
- Returns list of available tenants in response
- Rejects users without tenant access (error 5201)
- Same JWT token structure as standard login
- Requires `x-tenant-id` header for subsequent requests

See [Tenant-Scoped Authentication](#tenant-scoped-authentication) for complete documentation.

### Admin Endpoints

Base path: `/api/v1/admin/tenants`

**Platform-level tenant management** (requires platform admin role):

```typescript
// List all tenants (pagination)
GET /api/v1/admin/tenants
Authorization: Bearer <access_token>
Headers: None

// Create tenant
POST /api/v1/admin/tenants
Authorization: Bearer <access_token>
Body: { name: "Acme Corp" }

// Get tenant details
GET /api/v1/admin/tenants/:tenantId
Authorization: Bearer <access_token>

// Update tenant
PATCH /api/v1/admin/tenants/:tenantId
Authorization: Bearer <access_token>
Body: { name: "Acme Corporation", status: "active" }

// Soft delete tenant (status -> inactive)
DELETE /api/v1/admin/tenants/:tenantId
Authorization: Bearer <access_token>
```

**JIT (Just-in-Time) tenant access** (requires platform admin with `tenant:update` ability):

```typescript
// Assume temporary access to a tenant (creates time-limited membership)
POST /api/v1/admin/tenants/:tenantId/assume-access
Authorization: Bearer <access_token>
Body: {
    durationInHours: 2,
    reason: "Customer support ticket #123"
}
Response: {
    data: {
        memberId: "...",
        tenantId: "...",
        tenantName: "Acme Corp",
        role: "tenant-platform-support",
        expiresAt: "2025-01-15T14:00:00.000Z",
        reason: "Customer support ticket #123"
    }
}

// Revoke JIT access to a tenant
DELETE /api/v1/admin/tenants/:tenantId/revoke-access
Authorization: Bearer <access_token>
```

`durationInHours` accepts a value between `1` and `12`.
Request fails with `409 Conflict` (`tenant.error.jitAccessAlreadyActive`) if the caller already has an active membership for the tenant.

**JIT Access Flow:**

1. Platform admin calls `POST /assume-access` with `durationInHours` (1-12) and a required `reason`
2. A temporary `TenantMember` is created with `role: tenant-platform-support`, `isJit: true`, and an `expiresAt` timestamp
3. The admin can now use `x-tenant-id` header to access tenant-scoped endpoints
4. Access is automatically denied after expiry (membership auto-deactivated on next guard check)
5. Admin can also manually revoke via `DELETE /revoke-access`

- Access is time-limited (1-12 hours controlled via `durationInHours`)
- Reason is required for audit trail
- Activity log records both assume and revoke actions
- Expired JIT memberships are auto-deactivated by the tenant member guard
- Uses `tenant-platform-support` role with limited abilities (read-all + member management)

### Shared Endpoints

Base path: `/api/v1/shared/tenants`

**User's tenant access:**

```typescript
// Get current tenant details
GET /api/v1/shared/tenants/current
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Response: {
    data: {
        id: "...",
        name: "Acme Corp",
        status: "active",
        createdAt: "...",
        updatedAt: "..."
    }
}

// Update current tenant details
PATCH /api/v1/shared/tenants/current/tenant
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Body: { name: "Acme Corporation", status: "active" }

// List current tenant members
GET /api/v1/shared/tenants/current/members
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Query: page/perPage/orderBy/... (see docs/pagination.md)

// Add member to current tenant
POST /api/v1/shared/tenants/current/members
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Body: {
    userId: "507f1f77bcf86cd799439011",
    roleName: "tenant-user"
}

// Update member role/status
PATCH /api/v1/shared/tenants/current/members/:memberId
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Body: {
    roleName: "tenant-admin",
    status: "active"
}

// Soft delete member (status -> inactive)
DELETE /api/v1/shared/tenants/current/members/:memberId
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
```

## Setup and Migration

### 1. Database Schema

The tenant models are already included in `prisma/schema.prisma`. After making any changes:

```bash
# Push schema changes to database
pnpm db:push

# Regenerate Prisma client
pnpm db:generate
```

### 2. Seed Tenant Roles

The migration system includes tenant role seeding and legacy data migration:

```bash
# Seed all data (includes tenant roles)
pnpm migration:seed

# Or seed only roles
nest build migration --config nest-cli.json && node dist/migration.js role --type seed
```

**What gets seeded:**
- `tenant-admin` role with full tenant management abilities
- `tenant-user` role with standard tenant member abilities
- `tenant-platform-support` role for JIT support access

See `src/migration/data/migration.role.data.ts` for the exact seeded abilities.

### Usage Examples
- **Tenant-scoped handler:** guard the `x-tenant-id` before service logic. Example:

```typescript
@TenantProtected()
@AuthJwtAccessProtected()
@Get('reports')
reports(@TenantCurrent() tenant: ITenant) {
    return reportService.forTenant(tenant.id);
}
```

- **Member and role gating:** use `@TenantRoleProtected('tenant-admin')` or `@TenantPermissionProtected(...)` directly with `@AuthJwtAccessProtected()` and `@UserProtected()`. The tenant decorators already include tenant + membership guards.

- **JIT helper:** admin endpoints `POST /api/v1/admin/tenants/:tenantId/assume-access` and `DELETE .../revoke-access` issue temporary `tenant-platform-support` memberships for support workflows.

### Complete Flow Example

1. **Tenant login:** `POST /api/v1/public/tenant/login/credential` with `email`, `password`, `from`, and `X-Api-Key`. Response includes auth payload + `tenants[]`.
2. **Select tenant:** client picks a tenant ID from `tenants[]` and stores it as the active tenant.
3. **Resolve current tenant:** `GET /api/v1/shared/tenants/current` with access token + `x-tenant-id`.
4. **Tenant-scoped data:** call tenant APIs (e.g., `/api/v1/shared/tenants/current/members`) with access token + `x-tenant-id`.
5. **Switch tenant:** send a different `x-tenant-id` for the next tenant-scoped requests.

## Important Notes

### Guard Order

**Use one tenant guard decorator per endpoint based on access level:**

```typescript
// Tenant exists + user is active tenant member + has required abilities
@TenantPermissionProtected(...)
@UserProtected()
@AuthJwtAccessProtected()
@Get()
handler() {}
```

```typescript
// Tenant exists + user is active tenant member + has one required tenant role
@TenantRoleProtected('tenant-admin')
@UserProtected()
@AuthJwtAccessProtected()
@Patch()
handler() {}
```

```typescript
// Tenant exists + user is active tenant member (no extra role/ability checks)
@TenantMemberProtected()
@UserProtected()
@AuthJwtAccessProtected()
@Get()
handler() {}
```

**Notes:**
- `TenantMemberProtected` automatically applies `TenantProtected` logic
- `TenantRoleProtected` automatically applies `TenantMemberProtected` logic
- `TenantPermissionProtected` automatically applies `TenantMemberProtected` logic
- Add `@AuthJwtAccessProtected()` and `@UserProtected()` for tenant member operations

### Soft Delete Behavior

- Deleting tenants sets `status: inactive`
- Deleting members sets `status: inactive`
- No hard deletes occur via REST endpoints
- Inactive tenants/members are excluded from queries

### Performance Considerations

1. **Caching:** Consider caching tenant and membership lookups
2. **Indexes:** The schema includes indexes on `tenantId`, `userId`, `roleId`
3. **Batch Operations:** Use `Promise.all()` for parallel lookups (already implemented in service)

### Security Best Practices

1. **Always validate tenant context** - Use `@TenantProtected()` or higher
2. **Filter queries by tenantId** - Never expose cross-tenant data
3. **Validate member permissions** - Use `@TenantRoleProtected()` or `@TenantPermissionProtected()`
4. **Audit tenant operations** - Use `@ActivityLog()` for tenant changes
5. **Validate `x-tenant-id` in guards** - middleware only copies header value to request context

### Common Pitfalls

❌ **Don't forget x-tenant-id header:**
```typescript
// Missing x-tenant-id will result in 400 Bad Request
GET /api/v1/projects
Authorization: Bearer <token>
```

❌ **Don't mix platform and tenant protection:**
```typescript
// This doesn't make sense - tenant operations should use tenant guards
@RoleProtected('admin')  // Platform role
@TenantMemberProtected() // Tenant membership
@Get('projects')
```

❌ **Don't skip tenant validation:**
```typescript
// Dangerous - no tenant isolation
@AuthJwtAccessProtected()
@Get('projects')
getProjects() {
    // Returns ALL projects across ALL tenants
    return this.projectService.findAll();
}
```

✅ **Do filter by tenant:**
```typescript
@TenantMemberProtected()
@AuthJwtAccessProtected()
@Get('projects')
getProjects(@TenantCurrent() tenant: ITenant) {
    // Returns only projects for current tenant
    return this.projectService.findByTenant(tenant.id);
}
```

<!-- REFERENCES -->

[ref-doc-authorization]: authorization.md
[ref-doc-authentication]: authentication.md
[ref-doc-database]: database.md
