# Overview

This document covers the authorization system in ACK NestJS Boilerplate role-based access control, and policy enforcement.

## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Role-Based Access Control](#role-based-access-control)
    - [Role Types](#role-types)
    - [Role Management](#role-management)
    - [Role Structure](#role-structure)
      - [Example Role Entity Data](#example-role-entity-data)
  - [Policies](#policies)
    - [CASL Integration](#casl-integration)
      - [How CASL Works in the Project](#how-casl-works-in-the-project)
    - [Policy Actions](#policy-actions)
    - [Policy Subjects](#policy-subjects)
  - [Guards](#guards)
    - [Policy Role Guard](#policy-role-guard)
    - [Policy Ability Guard](#policy-ability-guard)
    - [Guard Decorators](#guard-decorators)
  - [Usage Examples](#usage-examples)
    - [Basic Role Protection](#basic-role-protection)
    - [Basic Policy Protection](#basic-policy-protection)
    - [Combined Protection](#combined-protection)
    - [Real-World Example](#real-world-example)

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

Roles are managed through the `RoleService` and can be created, updated, activated, deactivated, and deleted via the admin API endpoints. Each role has the following operations:

- **Create Role**: Create a new role with specified permissions
- **Update Role**: Modify an existing role's permissions or properties
- **Activate/Deactivate Role**: Enable or disable a role without deleting it
- **Delete Role**: Permanently remove a role (only if not in use)
- **List Roles**: View all available roles with filtering options

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

        if (permissions.some(e => e.subject === ENUM_POLICY_SUBJECT.ALL)) {
            can(ENUM_POLICY_ACTION.MANAGE, 'all');
        } else {
            for (const permission of permissions) {
                can(permission.action, permission.subject);
            }
        }

        return build({
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
   - The `manage` action implies all other actions (read, create, update, delete)
   - The `ALL` subject grants permissions across all subjects

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
    ALL = 'ALL',           // All resources
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

## Guards

The authorization system is enforced through NestJS guards, which are executed before the request handler. The project implements specialized guards to check both role-based and policy-based permissions.

### Policy Role Guard

The `PolicyRoleGuard` verifies if the user's role type matches the required role types for a particular endpoint.

### Policy Ability Guard

The `PolicyAbilityGuard` uses CASL to verify if the user has the permissions needed to perform specific actions on specific subjects.


### Guard Decorators

The project uses custom decorators to apply the guards and specify the required roles and permissions:

- **PolicyAbilityProtected**: Applies the PolicyAbilityGuard and defines required subject-action permissions
- **PolicyRoleProtected**: Applies the PolicyRoleGuard and defines required role types

These decorators make it easy to apply authorization requirements to controller routes in a declarative way, improving code readability and maintainability.

## Usage Examples

### Basic Role Protection

To restrict a route to specific role types:

```typescript
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@Get('/admin-only')
async adminOnly() {
    // Only ADMIN and SUPER_ADMIN roles can access
    return { message: 'Welcome, Admin!' };
}
```

### Basic Policy Protection

To restrict a route based on specific permissions:

```typescript
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ]
})
@Get('/users')
async listUsers() {
    // Only users with READ permission on USER subject can access
    return this.userService.findAll();
}
```

### Combined Protection

For comprehensive protection, combine both role and policy protection:

```typescript
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.CREATE]
})
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@Post('/users')
async createUser(@Body() userData: CreateUserDto) {
    // Only ADMIN roles with CREATE permission on USER subject can access
    return this.userService.create(userData);
}
```

### Real-World Example

A complete example from the role admin controller:

```typescript
@RoleAdminUpdateDoc()
@Response('role.update')
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.ROLE,
    action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE]
})
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@Put('/update/:role')
async update(
    @Param('role', RequestRequiredPipe, RoleParsePipe) role: RoleDoc,
    @Body() { description, permissions, type }: RoleUpdateRequestDto
): Promise<IResponse<DatabaseIdResponseDto>> {
    await this.roleService.update(role, { description, permissions, type });

    return {
        data: { _id: role._id },
    };
}
```
