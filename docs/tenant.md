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
- [Architecture](#architecture)
  - [Data Model](#data-model)
  - [Request Flow](#request-flow)
  - [Tenant Context](#tenant-context)
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

## Architecture

### Data Model

The tenant system uses three main models:

```prisma
model Tenant {
  id     String           @id @default(auto()) @map("_id") @db.ObjectId
  name   String
  status EnumTenantStatus @default(active)

  members TenantMember[] @relation("TenantMembers")
}

model TenantMember {
  id       String                 @id @default(auto()) @map("_id") @db.ObjectId
  tenantId String                 @db.ObjectId
  userId   String                 @db.ObjectId
  roleId   String                 @db.ObjectId
  status   EnumTenantMemberStatus @default(active)

  tenant Tenant? @relation("TenantMembers", fields: [tenantId], references: [id])
  user   User?   @relation("UserTenantMembers", fields: [userId], references: [id])
  role   Role?   @relation("TenantMemberRole", fields: [roleId], references: [id])
}

// Tenant roles are stored in the main Role model
model Role {
  name          String
  abilities     RoleAbility[]
  tenantMembers TenantMember[] @relation("TenantMemberRole")
}
```

**Key Points:**
- **Tenant** - Represents an organization (e.g., "Acme Corp")
- **TenantMember** - Links users to tenants with roles
- **Role** - Unified role model (both platform and tenant roles)
- Users can be members of multiple tenants
- Each membership has its own role and status

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
request.__abilities = [{ subject: "tenant", action: ["read", "update"] }]
```

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
import { TenantProtected, TenantCurrent } from '@modules/tenant/decorators/tenant.decorator';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';

@Controller('tenants')
export class TenantController {
    // Requires x-tenant-id header
    @TenantProtected()
    @Get('info')
    getTenantInfo(@TenantCurrent() tenant: ITenant) {
        return {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status
        };
    }
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid `x-tenant-id`
- `404 Not Found` - Tenant does not exist
- `403 Forbidden` - Tenant is inactive

#### TenantMemberProtected Decorator

**Method decorator** that validates the authenticated user is an active member of the tenant.

**What it does:**
- Applies `TenantProtected` first (validates tenant)
- Verifies user authentication
- Checks if user is a member of the tenant
- Ensures membership status is `active`
- Loads member's role and abilities
- Sets `request.__tenantMember` and `request.__abilities`

**Usage:**

```typescript
import { TenantMemberProtected, TenantMemberCurrent } from '@modules/tenant/decorators/tenant.decorator';
import { ITenantMember } from '@modules/tenant/interfaces/tenant.interface';

@Controller('tenants/current')
export class TenantMemberController {
    // Requires authentication + x-tenant-id + active membership
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

```typescript
import { TenantRoleProtected } from '@modules/tenant/decorators/tenant.decorator';

@Controller('tenants/current/members')
export class TenantMemberManagementController {
    // Only tenant-admin can add members
    @TenantRoleProtected('tenant-admin')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Post()
    addMember(@Body() dto: TenantMemberCreateRequestDto) {
        return this.tenantService.addMember(dto);
    }

    // Both tenant-admin and tenant-user can list members
    @TenantRoleProtected('tenant-admin', 'tenant-user')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Get()
    listMembers() {
        return this.tenantService.getMembers();
    }
}
```

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
- Uses member's role abilities from `request.__abilities`
- Checks each required ability against member's abilities
- Uses CASL `PolicyAbilityFactory` for permission checks

**Usage:**

```typescript
import { TenantPermissionProtected } from '@modules/tenant/decorators/tenant.decorator';
import { EnumPolicyAction, EnumPolicySubject } from '@modules/policy/enums/policy.enum';

@Controller('tenants/current')
export class TenantController {
    // Requires 'read' permission on 'tenant' subject
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.read]
    })
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Get()
    getTenant() {
        return this.tenantService.getCurrent();
    }

    // Requires 'update' permission on 'tenant' subject
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.update]
    })
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Patch()
    updateTenant(@Body() dto: TenantUpdateRequestDto) {
        return this.tenantService.updateCurrent(dto);
    }

    // Multiple permission checks
    @TenantPermissionProtected(
        {
            subject: EnumPolicySubject.tenant,
            action: [EnumPolicyAction.read]
        },
        {
            subject: EnumPolicySubject.tenantMember,
            action: [EnumPolicyAction.create]
        }
    )
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Post('members')
    addMember(@Body() dto: TenantMemberCreateRequestDto) {
        return this.tenantService.addMember(dto);
    }
}
```

**Error Responses:**
- All `TenantMemberProtected` errors
- `403 Forbidden` - Member doesn't have required abilities
- `500 Internal Server Error` - No required abilities configured (developer error)

#### TenantCurrent Parameter Decorator

Extracts the current tenant from the request context.

**Returns:** `ITenant | undefined`

**Usage:**

```typescript
import { TenantCurrent } from '@modules/tenant/decorators/tenant.decorator';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';

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
import { TenantMemberCurrent } from '@modules/tenant/decorators/tenant.decorator';
import { ITenantMember } from '@modules/tenant/interfaces/tenant.interface';

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
2. Validate tenant ID format
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
4. Load member's role and abilities
5. Set `request.__tenantMember` and `request.__abilities`

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
2. Get member's abilities from `request.__abilities`
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

The tenant system includes two predefined roles stored in the main `Role` model:

| Role Name | Description | Use Case |
|-----------|-------------|----------|
| `tenant-admin` | Full tenant management | Manage tenant settings, add/remove members, assign roles |
| `tenant-user` | Basic tenant access | View tenant data, read-only member list |

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
        }
    ]
}
```

**Available Policy Subjects:**
- `EnumPolicySubject.tenant` - Tenant resource operations
- `EnumPolicySubject.tenantMember` - Member management operations

**Available Policy Actions:**
- `EnumPolicyAction.read` - View/retrieve data
- `EnumPolicyAction.create` - Create new resources
- `EnumPolicyAction.update` - Modify existing resources
- `EnumPolicyAction.delete` - Delete/deactivate resources

## REST API Endpoints

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

**Tenant-scoped member management** (requires tenant membership + permissions):

```typescript
// List current tenant members
GET /api/v1/admin/tenants/current/members
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>

// Add member to current tenant
POST /api/v1/admin/tenants/current/members
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Body: {
    userId: "507f1f77bcf86cd799439011",
    roleName: "tenant-user"
}

// Update member role/status
PATCH /api/v1/admin/tenants/current/members/:memberId
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Body: {
    roleName: "tenant-admin",
    status: "active"
}

// Soft delete member (status -> inactive)
DELETE /api/v1/admin/tenants/current/members/:memberId
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
```

### Shared Endpoints

Base path: `/api/v1/shared/tenants`

**User's tenant access:**

```typescript
// List my tenant memberships
GET /api/v1/shared/tenants/memberships
Authorization: Bearer <access_token>
Response: {
    data: [
        {
            id: "...",
            tenant: { id: "...", name: "Acme Corp" },
            role: { id: "...", name: "tenant-admin" },
            status: "active"
        },
        {
            id: "...",
            tenant: { id: "...", name: "Beta Inc" },
            role: { id: "...", name: "tenant-user" },
            status: "active"
        }
    ]
}

// Get current tenant membership details
GET /api/v1/shared/tenants/current
Authorization: Bearer <access_token>
x-tenant-id: <tenant_id>
Response: {
    data: {
        id: "...",
        tenantId: "...",
        userId: "...",
        role: { id: "...", name: "tenant-admin" },
        tenant: { id: "...", name: "Acme Corp", status: "active" }
    }
}
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
- `tenant-user` role with read-only abilities
- Legacy `TenantRole` → `Role` migration (if upgrading from older version)

### 3. Legacy Migration

If upgrading from a previous version with the separate `TenantRole` model, the migration automatically:

1. Upserts new `tenant-admin` and `tenant-user` roles in the `Role` model
2. Finds legacy `TenantRole` records with keys: `tenantOwner`, `tenantAdmin`, `tenantMember`
3. Updates `TenantMember` records to point to the new `Role` IDs
4. Removes the legacy `TenantRoles` collection

This migration is idempotent and safe to run multiple times.

## Usage Examples

### Basic Tenant Protection

Protect endpoints that operate within tenant context:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { TenantProtected, TenantCurrent } from '@modules/tenant/decorators/tenant.decorator';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    // Requires x-tenant-id header
    @TenantProtected()
    @AuthJwtAccessProtected()
    @Get('reports')
    getTenantReports(@TenantCurrent() tenant: ITenant) {
        // Only returns reports for the specified tenant
        return this.analyticsService.getReports(tenant.id);
    }
}
```

### Member Management

Restrict member management to tenant admins:

```typescript
import { Controller, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { TenantRoleProtected, TenantMemberProtected } from '@modules/tenant/decorators/tenant.decorator';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';

@Controller('admin/tenants/current/members')
export class TenantMemberController {
    constructor(private readonly tenantService: TenantService) {}

    // Only tenant-admin can add members
    @TenantRoleProtected('tenant-admin')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Post()
    async addMember(
        @TenantCurrent() tenant: ITenant,
        @Body() dto: TenantMemberCreateRequestDto
    ) {
        return this.tenantService.addMember(tenant.id, dto);
    }

    // Only tenant-admin can update members
    @TenantRoleProtected('tenant-admin')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Patch(':memberId')
    async updateMember(
        @TenantCurrent() tenant: ITenant,
        @Param('memberId') memberId: string,
        @Body() dto: TenantMemberUpdateRequestDto
    ) {
        return this.tenantService.updateMember(tenant.id, memberId, dto);
    }

    // Both roles can view members
    @TenantRoleProtected('tenant-admin', 'tenant-user')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Get()
    async listMembers(@TenantCurrent() tenant: ITenant) {
        return this.tenantService.getMembers(tenant.id);
    }
}
```

### Role-Based Protection

Use role names for simple authorization:

```typescript
@Controller('tenants/current/settings')
export class TenantSettingsController {
    // Only admins can access settings
    @TenantRoleProtected('tenant-admin')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Get()
    getSettings(@TenantCurrent() tenant: ITenant) {
        return this.settingsService.getSettings(tenant.id);
    }

    @TenantRoleProtected('tenant-admin')
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Patch()
    updateSettings(
        @TenantCurrent() tenant: ITenant,
        @Body() dto: SettingsUpdateDto
    ) {
        return this.settingsService.updateSettings(tenant.id, dto);
    }
}
```

### Permission-Based Protection

Use fine-grained abilities for complex authorization:

```typescript
import { EnumPolicyAction, EnumPolicySubject } from '@modules/policy/enums/policy.enum';
import { TenantPermissionProtected } from '@modules/tenant/decorators/tenant.decorator';

@Controller('tenants/current')
export class TenantController {
    // Requires read permission on tenant subject
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.read]
    })
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Get()
    getTenant(@TenantCurrent() tenant: ITenant) {
        return { data: tenant };
    }

    // Requires update permission on tenant subject
    @TenantPermissionProtected({
        subject: EnumPolicySubject.tenant,
        action: [EnumPolicyAction.update]
    })
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Patch()
    updateTenant(
        @TenantCurrent() tenant: ITenant,
        @Body() dto: TenantUpdateRequestDto
    ) {
        return this.tenantService.update(tenant.id, dto);
    }

    // Requires both tenant read AND member create permissions
    @TenantPermissionProtected(
        {
            subject: EnumPolicySubject.tenant,
            action: [EnumPolicyAction.read]
        },
        {
            subject: EnumPolicySubject.tenantMember,
            action: [EnumPolicyAction.create]
        }
    )
    @TenantMemberProtected()
    @AuthJwtAccessProtected()
    @Post('members')
    inviteMember(@Body() dto: InviteMemberDto) {
        return this.tenantService.inviteMember(dto);
    }
}
```

### Complete Flow Example

Typical user flow for tenant-scoped operations:

```typescript
// 1. User logs in
POST /api/v1/auth/login
Response: { accessToken: "...", refreshToken: "..." }

// 2. User lists their tenant memberships
GET /api/v1/shared/tenants/memberships
Authorization: Bearer <access_token>
Response: {
    data: [
        { id: "...", tenant: { id: "tenant-123", name: "Acme Corp" } },
        { id: "...", tenant: { id: "tenant-456", name: "Beta Inc" } }
    ]
}

// 3. User selects "Acme Corp" and gets current membership details
GET /api/v1/shared/tenants/current
Authorization: Bearer <access_token>
x-tenant-id: tenant-123
Response: {
    data: {
        role: { name: "tenant-admin" },
        tenant: { id: "tenant-123", name: "Acme Corp" }
    }
}

// 4. User performs tenant-scoped operations
GET /api/v1/projects
Authorization: Bearer <access_token>
x-tenant-id: tenant-123
// Returns only projects for Acme Corp

// 5. User switches to another tenant
GET /api/v1/projects
Authorization: Bearer <access_token>
x-tenant-id: tenant-456
// Returns only projects for Beta Inc
```

## Important Notes

### Guard Order

**Always apply decorators in this order:**

```typescript
@TenantPermissionProtected(...)  // 4. Check permissions (if needed)
@TenantRoleProtected(...)        // 3. Check role (if needed)
@TenantMemberProtected()         // 2. Verify membership
@TenantProtected()               // 1. Validate tenant (can be omitted if using TenantMemberProtected)
@AuthJwtAccessProtected()        // 0. Authenticate user
@Get()
handler() {}
```

**Notes:**
- `TenantMemberProtected` automatically applies `TenantProtected` logic
- `TenantRoleProtected` automatically applies `TenantMemberProtected` logic
- `TenantPermissionProtected` automatically applies `TenantMemberProtected` logic
- Always add `@AuthJwtAccessProtected()` for tenant member operations

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
5. **Validate x-tenant-id** - Middleware ensures header presence

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

### Extending the System

**Adding Custom Tenant Roles:**

```typescript
// 1. Add role data to migration.role.data.ts
{
    name: 'tenant-moderator',
    description: 'Tenant moderator with limited admin access',
    abilities: [
        {
            subject: EnumPolicySubject.tenant,
            action: [EnumPolicyAction.read]
        },
        {
            subject: EnumPolicySubject.tenantMember,
            action: [EnumPolicyAction.read, EnumPolicyAction.create]
        }
    ],
    type: EnumRoleType.user
}

// 2. Run migration
pnpm migration:seed

// 3. Use in decorators
@TenantRoleProtected('tenant-admin', 'tenant-moderator')
@Get('members')
listMembers() { ... }
```

**Adding Custom Policy Subjects:**

```typescript
// 1. Add to policy.enum.ts
export enum EnumPolicySubject {
    tenant = 'tenant',
    tenantMember = 'tenantMember',
    tenantProject = 'tenantProject',  // New subject
}

// 2. Update role abilities in migration.role.data.ts
{
    name: 'tenant-admin',
    abilities: [
        ...,
        {
            subject: EnumPolicySubject.tenantProject,
            action: [
                EnumPolicyAction.read,
                EnumPolicyAction.create,
                EnumPolicyAction.update,
                EnumPolicyAction.delete
            ]
        }
    ]
}

// 3. Use in permission checks
@TenantPermissionProtected({
    subject: EnumPolicySubject.tenantProject,
    action: [EnumPolicyAction.create]
})
@Post('projects')
createProject() { ... }
```

<!-- REFERENCES -->

[ref-doc-authorization]: authorization.md
[ref-doc-authentication]: authentication.md
[ref-doc-database]: database.md
