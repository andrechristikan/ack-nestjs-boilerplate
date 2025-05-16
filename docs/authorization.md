# Overview

This document covers the authorization system role-based access control, and policy enforcement.

This documentation explains the features and usage of:
- **Policy Module**: Located at `src/modules/policy`
- **Role Module**: Located at `src/modules/role`
- **User Module** (protection features): Located at `src/modules/user`

> **Note**: The `@AuthJwtAccessProtected()` decorator is a fundamental requirement for all protected routes in the system, including those using Role-Based Access Control (RBAC) and Policy-based permissions. It serves as the base authentication layer that validates the JWT token and extracts the user payload. All other protection decorators like `@UserProtected()`, `@PolicyRoleProtected()`, and `@PolicyAbilityProtected()` build upon this foundation and require a valid JWT token to function properly.

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Role-Based Access Control](#role-based-access-control)
    - [Role Types](#role-types)
    - [Role Management](#role-management)
      - [Admin Role Endpoints](#admin-role-endpoints)
      - [System Role Endpoints](#system-role-endpoints)
    - [Role Structure](#role-structure)
      - [Example Role Entity Data](#example-role-entity-data)
    - [RBAC Implementation Examples](#rbac-implementation-examples)
  - [User Protection](#user-protection)
    - [UserProtected Decorator](#userprotected-decorator)
    - [UserGuard Implementation](#userguard-implementation)
    - [Usage Examples](#usage-examples)
      - [Basic User Protection](#basic-user-protection)
      - [Combining with Role Protection](#combining-with-role-protection)
      - [Combining with Policy Abilities](#combining-with-policy-abilities)
  - [Policies](#policies)
    - [CASL Integration](#casl-integration)
      - [How CASL Works in the Project](#how-casl-works-in-the-project)
    - [Policy Actions](#policy-actions)
    - [Policy Subjects](#policy-subjects)
    - [Policy Implementation Examples](#policy-implementation-examples)
      - [Protecting Routes with Policy Abilities](#protecting-routes-with-policy-abilities)
      - [Combining Role Protection with Policy Abilities](#combining-role-protection-with-policy-abilities)

## Role-Based Access Control

The Role-Based Access Control (RBAC) system manages user access rights through role assignments. Each user is assigned a role that defines their access level within the system.

### Role Types

The system defines three main role types:

```typescript
export enum ENUM_POLICY_ROLE_TYPE {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER',
}
```

- **SUPER_ADMIN**: Has unrestricted access to all resources and operations
- **ADMIN**: Has access to administrative functions with configurable permissions
- **USER**: Regular user with limited permissions based on their role

### Role Management

Roles are managed through the `RoleService` and can be accessed via both admin and system API endpoints. The system provides comprehensive role management through the following API endpoints:

#### Admin Role Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/role/list` | GET | List all roles with pagination and filtering options |
| `/role/get/:role` | GET | Get detailed information about a specific role |
| `/role/create` | POST | Create a new role with specified permissions |
| `/role/update/:role` | PUT | Update an existing role's description, permissions, or type |
| `/role/update/:role/inactive` | PATCH | Deactivate a role (disable it without deletion) |
| `/role/update/:role/active` | PATCH | Activate a previously inactive role |
| `/role/delete/:role` | DELETE | Permanently delete a role (only if not in use) |

#### System Role Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/role/list` | GET | List all roles with pagination (system access) |

All role management endpoints include proper validation, error handling, and permission checks to ensure secure role administration.

### Role Structure

A role in the system consists of:

```typescript
export class RoleEntity {
    name: string;           // Unique name of the role
    description?: string;   // Optional description
    isActive: boolean;      // Whether the role is active
    type: ENUM_POLICY_ROLE_TYPE; // Role type (SUPER_ADMIN, ADMIN, USER)
    permissions: RolePermissionEntity[]; // Assigned permissions
}
```

Permissions within a role define what actions can be performed on specific resources.

#### Example Role Entity Data

Here are examples of role entities as they would be stored in the database:

```typescript
// Super Admin Role
{
  "_id": "f45c89ae-4539-4e99-9ae8-ab1f99f1d632",
  "name": "superadmin", 
  "description": "Super administrator with unrestricted access",
  "isActive": true,
  "type": "SUPER_ADMIN",
  "permissions": [], // Super admin doesn't need explicit permissions
  "createdAt": "2023-04-15T08:30:45.123Z",
  "updatedAt": "2023-04-15T08:30:45.123Z"
}

// Admin Role
{
  "_id": "a77c65be-b1fc-4bd9-8a2f-c8f7d3c9e123",
  "name": "admin",
  "description": "System administrator with elevated privileges",
  "isActive": true,
  "type": "ADMIN",
  "permissions": [
    {
      "subject": "USER",
      "action": ["manage"]
    },
    {
      "subject": "ROLE",
      "action": ["read", "create", "update"]
    },
    {
      "subject": "SETTING",
      "action": ["read", "update"]
    }
  ],
  "createdAt": "2023-04-15T09:15:22.456Z",
  "updatedAt": "2023-05-20T14:32:10.789Z"
}

// User Role (Content Creator)
{
  "_id": "d9e5f123-7aa8-42b1-95c3-7de4f8b72d45",
  "name": "content_creator",
  "description": "User who can create and manage content",
  "isActive": true,
  "type": "USER",
  "permissions": [
    {
      "subject": "CONTENT",
      "action": ["read", "create", "update", "delete"]
    },
    {
      "subject": "MEDIA",
      "action": ["read", "create", "delete"]
    },
    {
      "subject": "COMMENT",
      "action": ["read", "update", "delete"]
    }
  ],
  "createdAt": "2023-06-10T11:20:33.789Z",
  "updatedAt": "2023-06-10T11:20:33.789Z"
}

// Restricted User Role
{
  "_id": "b22a47cf-1e5d-48ab-9c72-f6b34c8e1111",
  "name": "viewer",
  "description": "User with read-only access",
  "isActive": true,
  "type": "USER",
  "permissions": [
    {
      "subject": "CONTENT",
      "action": ["read"]
    },
    {
      "subject": "COMMENT",
      "action": ["read"]
    }
  ],
  "createdAt": "2023-06-12T15:45:12.456Z",
  "updatedAt": "2023-07-05T09:18:27.123Z"
}
```

These examples demonstrate different role configurations:
- The **Super Admin** role has no explicit permissions as it has unrestricted access by default
- The **Admin** role has management capabilities for users and limited access to roles and settings
- The **Content Creator** role can manipulate content, media, and comments
- The **Viewer** role has read-only access to content and comments

### RBAC Implementation Examples


Different role types can access different routes:

```typescript
// Admin-only route
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@AuthJwtAccessProtected()
@Post('/create')
async createUser() {
    // Only ADMIN can create users
}

// Super admin-only route
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN)
@AuthJwtAccessProtected()
@Delete('/delete/:id')
async deleteRole() {
    // Only SUPER_ADMIN can delete roles
}

// Multiple role types allowed
@PolicyRoleProtected([ENUM_POLICY_ROLE_TYPE.ADMIN, ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN])
@AuthJwtAccessProtected()
@Get('/settings')
async getSettings() {
    // Both ADMIN and SUPER_ADMIN can access settings
}
```

## User Protection

The User Protection system ensures that only active user can access protected routes. The system validates the user's existence, and active status before allowing access to the protected endpoints.

### UserProtected Decorator

The `@UserProtected()` decorator is a custom NestJS decorator that applies the `UserGuard` to route handlers. This decorator is crucial for ensuring that only valid users can access protected routes.


```typescript
import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/modules/user/guards/user.guard';

export function UserProtected(): MethodDecorator {
    return applyDecorators(UseGuards(UserGuard));
}
```

### UserGuard Implementation

The `UserGuard` performs several important validations:

1. Verifies that the user exists in the database
2. Checks if the user is active (not inactive, blocked, or deleted)
3. Confirms that the user's assigned role is active
4. Validates that the user's password is not expired

### Usage Examples

The `@UserProtected()` decorator is typically used together with other security decorators to build a comprehensive security layer for endpoints:

#### Basic User Protection

```typescript
@Response('user.profile')
@UserProtected()
@AuthJwtAccessProtected()
@Get('/profile')
async profile(
    @AuthJwtPayload('user', UserActiveParsePipe) user: IUserDoc
): Promise<IResponse<UserProfileResponseDto>> {
    // This endpoint is only accessible by authenticated users with active status
    // ...implementation
}
```

#### Combining with Role Protection

```typescript
@Response('user.delete')
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.USER)
@UserProtected()
@AuthJwtAccessProtected()
@Delete('/delete')
async delete(
    @AuthJwtPayload('user', UserParsePipe) user: UserDoc
): Promise<void> {
    // This endpoint is only accessible by authenticated users with USER role type
    // ...implementation
}
```

#### Combining with Policy Abilities

```typescript
@ResponsePaging('user.list')
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ],
})
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@UserProtected()
@AuthJwtAccessProtected()
@Get('/list')
async list(): Promise<IResponsePaging<UserListResponseDto>> {
    // This endpoint is only accessible by authenticated ADMIN users with READ permission on USER subject
    // ...implementation
}
```

## Policies

The policy system extends RBAC with fine-grained permission control using the CASL library for ability-based authorization. Policies define what actions a user can perform on which resources.

### CASL Integration

#### How CASL Works in the Project

1. **Ability Definition**: The system uses the `PolicyAbilityFactory` to create CASL abilities based on a user's permissions:

```typescript
@Injectable()
export class PolicyAbilityFactory {
    createForUser(permissions: RolePermissionEntity[]): IPolicyAbilityRule {
        const { can, build } = new AbilityBuilder<IPolicyAbilityRule>(
            createMongoAbility
        );

        for (const permission of permissions) {
            can(permission.action, permission.subject);
        }

        return build({
            // Read https://casl.js.org/v6/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item: any) =>
                item.constructor as ExtractSubjectType<IPolicyAbilitySubject>,
        });
    }
}
```

2. **Permission Checking**: When a request is made, the `PolicyAbilityGuard` uses CASL to check if the user has the required permissions:

```typescript
handlerAbilities(
    userAbilities: IPolicyAbilityRule,
    abilities: IPolicyAbility[]
): boolean {
    return abilities.every((ability: IPolicyAbility) =>
        ability.action.every((action: ENUM_POLICY_ACTION) =>
            userAbilities.can(action, ability.subject)
        )
    );
}
```

3. **Hierarchical Permissions**: CASL allows for hierarchical permissions:
  The `manage` action implies all other actions (read, create, update, delete)

4. **Storage in MongoDB**: Permissions are stored as part of the role document in MongoDB, allowing for dynamic updates without code changes.

### Policy Actions

Available actions that can be assigned to permissions:

```typescript
export enum ENUM_POLICY_ACTION {
    MANAGE = 'manage',   // Full access (implies all other actions)
    READ = 'read',       // View access
    CREATE = 'create',   // Create new resources
    UPDATE = 'update',   // Modify existing resources
    DELETE = 'delete',   // Remove resources
}
```

### Policy Subjects

Subjects represent the resources that can be protected by policies:

```typescript
export enum ENUM_POLICY_SUBJECT {
    AUTH = 'AUTH',         // Authentication related
    API_KEY = 'API_KEY',   // API key management
    SETTING = 'SETTING',   // System settings
    ROLE = 'ROLE',         // Role management
    USER = 'USER',         // User management
    SESSION = 'SESSION',   // Session management
    ACTIVITY = 'ACTIVITY', // User activities
    // ...other subjects
}
```

### Policy Implementation Examples

#### Protecting Routes with Policy Abilities

Routes can be protected using specific abilities defined by action and subject combinations:

```typescript
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ],
})
@AuthJwtAccessProtected()
@Get('/list')
async listUsers() {
    // Only accessible if the user has READ permission on USER subject
    // ...implementation
}

@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
})
@AuthJwtAccessProtected()
@Post('/create')
async createUser() {
    // Requires both READ and CREATE permissions on USER subject
    // ...implementation
}
```

#### Combining Role Protection with Policy Abilities

For more granular control, combine role protection with policy abilities:

```typescript
// Requires ADMIN role AND specific policy abilities
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
})
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@AuthJwtAccessProtected()
@Put('/update/:user')
async updateUser() {
    // Only ADMIN with READ and UPDATE permissions on USER can access
    // ...implementation
}
```
