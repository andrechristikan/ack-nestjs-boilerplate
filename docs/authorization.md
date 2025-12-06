# Authorization Documentation

This documentation explains the features and usage of: 
- **UserProtected**: Located at `src/modules/user/decorators`
- **RoleProtected**: Located at `src/modules/role/decorators`
- **PolicyAbilityProtected**: Located at `src/modules/policy/decorators`
- **TermPolicyAcceptanceProtected**: Located at `src/modules/term-policy/decorators`

## Overview

This authorization system provides a comprehensive, layered security approach for ACK NestJs Boilerplate. It implements multiple protection levels including user authentication, role-based access control, policy-based permissions, and terms acceptance verification.

The system is built using NestJS guards and decorators, making it easy to apply different authorization levels to your route handlers with simple, declarative syntax.

## Related Documents

- [Configuration Documentation][ref-doc-configuration] - For Redis configuration settings
- [Environment Documentation][ref-doc-environment] - For Redis environment variables
- [Authentication Documentation][ref-doc-authentication] - For understand authentication system
- [Activity Log Documentation][ref-doc-activity-log] - For tracking authorization-related user activities

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [User Protected](#user-protected)
  - [Decorators](#decorators)
    - [UserProtected() Decorator](#userprotected-decorator)
    - [UserCurrent() Parameter Decorator](#usercurrent-parameter-decorator)
  - [Guards](#guards)
    - [UserGuard](#userguard)
  - [Important Notes](#important-notes)
- [Role Protected](#role-protected)
  - [Decorators](#decorators-1)
    - [RoleProtected() Decorator](#roleprotected-decorator)
  - [Getting Current Role](#getting-current-role)
  - [Guards](#guards-1)
    - [RoleGuard](#roleguard)
  - [Important Notes](#important-notes-1)
- [Policy Ability Protected](#policy-ability-protected)
  - [Decorators](#decorators-2)
    - [PolicyAbilityProtected() Decorator](#policyabilityprotected-decorator)
  - [Guards](#guards-2)
    - [PolicyAbilityGuard](#policyabilityguard)
  - [CASL Integration](#casl-integration)
  - [Important Notes](#important-notes-2)
- [Term Policy Acceptance Protected](#term-policy-acceptance-protected)
  - [Decorators](#decorators-3)
    - [TermPolicyAcceptanceProtected() Decorator](#termpolicyacceptanceprotected-decorator)
  - [Guards](#guards-3)
    - [TermPolicyGuard](#termpolicyguard)
  - [Important Notes](#important-notes-3)

## User Protected

`UserProtected` provides basic user authentication and verification. It ensures that only authenticated users can access protected routes and optionally validates whether the user's email has been verified.

### Decorators

#### UserProtected Decorator

**Method decorator** that applies `UserGuard` to route handlers.

**Parameters:**
- `isVerified` (boolean, optional): Whether to require email verification. Default: `true`

**Usage:**

```typescript
@UserProtected()
@AuthJwtAccessProtected()
@Get('profile')
getProfile(@UserCurrent() user: IUser) {
  return user;
}

// Allow unverified users
@UserProtected(false)
@AuthJwtAccessProtected()
@Get('dashboard')
getDashboard(@UserCurrent() user: IUser) {
  return { user };
}
```

#### UserCurrent Parameter Decorator

Extracts the authenticated user object from the request context.

**Returns:** `IUser | undefined`

**Usage:**

```typescript
@UserProtected()
@AuthJwtAccessProtected()
@Get('me')
getCurrentUser(@UserCurrent() user: IUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}
```

### Guards

#### `UserGuard`

The guard implementation that performs the actual validation.

The `UserProtected` decorator follows this validation sequence:

1. **Authentication Check**: Verifies that `request.user` exists (populated by JWT strategy)
2. **User Lookup**: Retrieves user from database with role information
3. **User Existence**: Ensures user record exists
4. **Status Validation**: Confirms user status is `active`
5. **Password Expiry**: Checks if password has expired
6. **Email Verification**: Validates email verification if required

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT and populate request.user]
    JwtGuard --> CheckAuth{request.user exists?}
    CheckAuth -->|No| ErrorAuth[Throw UnauthorizedException<br/>JWT_ACCESS_TOKEN_INVALID]
    CheckAuth -->|Yes| LookupUser[Retrieve user from database<br/>with role information]
    
    LookupUser --> UserExists{User exists<br/>in database?}
    UserExists -->|No| ErrorNotFound[Throw ForbiddenException<br/>USER_NOT_FOUND]
    UserExists -->|Yes| CheckStatus{User status<br/>is active?}
    
    CheckStatus -->|No| ErrorInactive[Throw ForbiddenException<br/>INACTIVE_FORBIDDEN]
    CheckStatus -->|Yes| CheckPassword{Password<br/>expired?}
    
    CheckPassword -->|Yes| ErrorPassword[Throw ForbiddenException<br/>PASSWORD_EXPIRED]
    CheckPassword -->|No| CheckVerified{isVerified required<br/>AND user not verified?}
    
    CheckVerified -->|Yes| ErrorVerified[Throw ForbiddenException<br/>EMAIL_NOT_VERIFIED]
    CheckVerified -->|No| SetUser[Set request.__user = user]
    
    SetUser --> Success([Access Granted])
    
    ErrorAuth --> End([Request Rejected])
    ErrorNotFound --> End
    ErrorInactive --> End
    ErrorPassword --> End
    ErrorVerified --> End
```

### Important Notes

- `@UserProtected()` **requires** `@AuthJwtAccessProtected()` to be applied first (above in code)
- `@AuthJwtAccessProtected()` populates `request.user` from JWT token. See [Authentication Documentation][ref-doc-authentication] for details
- This decorator populates `request.__user` which is required by downstream guards

## Role Protected

`RoleProtected` implements role-based access control (RBAC) to restrict route access based on user roles. It ensures that only users with specific role types can access protected endpoints.

### Decorators

#### RoleProtected Decorator

**Method decorator** that applies `RoleGuard` to route handlers.

**Parameters:**
- `...requiredRoles` (ENUM_ROLE_TYPE[]): One or more role types required to access the route

**Available Role Types:**
- `ENUM_ROLE_TYPE.superAdmin` - Super administrator with unrestricted access
- `ENUM_ROLE_TYPE.admin` - Administrator role
- `ENUM_ROLE_TYPE.user` - Standard user role

**Usage:**

```typescript
// Single role requirement
@RoleProtected(ENUM_ROLE_TYPE.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Get('admin/dashboard')
getAdminDashboard(@UserCurrent() user: IUser) {
  return this.dashboardService.getAdminData();
}

// Multiple role requirements (user must have one of the specified roles)
@RoleProtected(ENUM_ROLE_TYPE.admin, ENUM_ROLE_TYPE.superAdmin)
@UserProtected()
@AuthJwtAccessProtected()
@Delete('users/:id')
deleteUser(@Param('id') id: string) {
  return this.userService.delete(id);
}
```

### Getting Current Role

To access the current user's role, use the `@UserCurrent()` decorator and access the `role` property:

```typescript
@RoleProtected(ENUM_ROLE_TYPE.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Get('role-info')
getRoleInfo(@UserCurrent() user: IUser) {
  return {
    roleType: user.role.type,
    roleName: user.role.name,
    abilities: user.role.abilities
  };
}
```

### Guards

#### `RoleGuard`

The guard implementation that validates user roles and populates role abilities.

The `RoleProtected` decorator follows this validation sequence:

1. **User Validation**: Verifies that `request.__user` and `request.user` exist
2. **Super Admin Bypass**: If user role is `superAdmin`, grants immediate access with empty abilities array
3. **Required Roles Check**: Validates that required roles are defined
4. **Role Match**: Confirms user's role type matches one of the required roles
5. **Abilities Population**: Attaches role abilities to `request.__abilities` for downstream use

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate and load user]
    UserGuard --> CheckUser{request.__user and<br/>request.user exist?}
    
    CheckUser -->|No| ErrorUser[Throw ForbiddenException<br/>JWT_ACCESS_TOKEN_INVALID]
    CheckUser -->|Yes| CheckSuperAdmin{User role is<br/>superAdmin?}
    
    CheckSuperAdmin -->|Yes| GrantSuperAdmin[Grant access with<br/>empty abilities array]
    CheckSuperAdmin -->|No| CheckRequired{Required roles<br/>defined?}
    
    CheckRequired -->|No| ErrorPredefined[Throw InternalServerErrorException<br/>PREDEFINED_NOT_FOUND]
    CheckRequired -->|Yes| CheckRoleMatch{User role matches<br/>required roles?}
    
    CheckRoleMatch -->|No| ErrorForbidden[Throw ForbiddenException<br/>ROLE_FORBIDDEN]
    CheckRoleMatch -->|Yes| SetAbilities[Set request.__abilities<br/>from user role]
    
    GrantSuperAdmin --> Success([Access Granted])
    SetAbilities --> Success
    
    ErrorUser --> End([Request Rejected])
    ErrorPredefined --> End
    ErrorForbidden --> End
```

### Important Notes

- `@RoleProtected()` **requires** `@AuthJwtAccessProtected()` and `@UserProtected()` to be applied
- `@AuthJwtAccessProtected()` must be placed at the bottom, followed by `@RoleProtected()`, then `@UserProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- This decorator populates `request.__abilities` which is required by policy guards
- Incorrect ordering will result in runtime errors
- Users with `superAdmin` role type have unrestricted access to all `@RoleProtected` routes, regardless of the specified required roles. The guard returns an empty abilities array for super admins, as they bypass ability checks.


## Policy Ability Protected

`PolicyAbilityProtected` implements fine-grained, permission-based access control using CASL (an isomorphic authorization library). It allows you to define specific actions (read, create, update, delete, manage) that users can perform on specific subjects (resources like users, roles, settings, etc.).

### Decorators

#### PolicyAbilityProtected Decorator

**Method decorator** that applies `PolicyAbilityGuard` to route handlers.

**Parameters:**
- `...requiredAbilities` (RoleAbilityRequestDto[]): One or more policy ability objects defining required permissions

**Available Policy Actions:**
- `ENUM_POLICY_ACTION.MANAGE` - Full control over a subject
- `ENUM_POLICY_ACTION.READ` - Read/view permission
- `ENUM_POLICY_ACTION.CREATE` - Create new resources
- `ENUM_POLICY_ACTION.UPDATE` - Modify existing resources
- `ENUM_POLICY_ACTION.DELETE` - Remove resources

**Available Policy Subjects:**
- `ENUM_POLICY_SUBJECT.ALL` - All resources
- `ENUM_POLICY_SUBJECT.AUTH` - Authentication resources
- `ENUM_POLICY_SUBJECT.SETTING` - Application settings
- `ENUM_POLICY_SUBJECT.API_KEY` - API key management
- `ENUM_POLICY_SUBJECT.COUNTRY` - Country data
- `ENUM_POLICY_SUBJECT.ROLE` - Role management
- `ENUM_POLICY_SUBJECT.USER` - User management
- `ENUM_POLICY_SUBJECT.SESSION` - Session management
- `ENUM_POLICY_SUBJECT.ACTIVITY_LOG` - Activity logs
- `ENUM_POLICY_SUBJECT.PASSWORD_HISTORY` - Password history
- `ENUM_POLICY_SUBJECT.TERM_POLICY` - Terms and policies
- `ENUM_POLICY_SUBJECT.FEATURE_FLAG` - Feature flags

**Usage:**

```typescript
// Single ability requirement
@PolicyAbilityProtected({
  subject: ENUM_POLICY_SUBJECT.USER,
  action: [ENUM_POLICY_ACTION.READ]
})
@RoleProtected(ENUM_ROLE_TYPE.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Get('users')
getUsers() {
  return this.userService.findAll();
}

// Multiple actions on single subject
@PolicyAbilityProtected({
  subject: ENUM_POLICY_SUBJECT.USER,
  action: [ENUM_POLICY_ACTION.UPDATE, ENUM_POLICY_ACTION.DELETE]
})
@RoleProtected(ENUM_ROLE_TYPE.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Put('users/:id')
updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  return this.userService.update(id, dto);
}

// Multiple ability requirements (different subjects)
@PolicyAbilityProtected(
  {
    subject: ENUM_POLICY_SUBJECT.ROLE,
    action: [ENUM_POLICY_ACTION.READ]
  },
  {
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.MANAGE]
  }
)
@RoleProtected(ENUM_ROLE_TYPE.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Post('users/:id/assign-role')
assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
  return this.userService.assignRole(id, dto.roleId);
}
```

### Guards

#### `PolicyAbilityGuard`

The guard implementation that validates user abilities using CASL library.

The `PolicyAbilityProtected` decorator follows this validation sequence:

1. **User Validation**: Verifies that `request.__user` and `request.user` exist
2. **Super Admin Bypass**: If user role is `superAdmin`, grants immediate access
3. **Required Abilities Check**: Validates that required abilities are defined
4. **Ability Creation**: Creates CASL ability rules from user's role abilities (`request.__abilities`)
5. **Permission Validation**: Checks if user abilities match all required abilities
6. **Access Decision**: Grants or denies access based on permission match

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate and load user]
    UserGuard --> RoleGuard[ @RoleProtected<br/>Validate role and load abilities]
    RoleGuard --> CheckUser{request.__user and<br/>request.user exist?}
    
    CheckUser -->|No| ErrorUser[Throw ForbiddenException<br/>JWT_ACCESS_TOKEN_INVALID]
    CheckUser -->|Yes| CheckSuperAdmin{User role is<br/>superAdmin?}
    
    CheckSuperAdmin -->|Yes| GrantSuperAdmin[Grant immediate access]
    CheckSuperAdmin -->|No| CheckRequired{Required abilities<br/>defined?}
    
    CheckRequired -->|No| ErrorPredefined[Throw InternalServerErrorException<br/>PREDEFINED_NOT_FOUND]
    CheckRequired -->|Yes| CreateAbilities[Create CASL ability rules<br/>from request.__abilities]
    
    CreateAbilities --> ValidateAbilities{All required abilities<br/>present in user abilities?}
    
    ValidateAbilities -->|No| ErrorForbidden[Throw ForbiddenException<br/>POLICY_FORBIDDEN]
    ValidateAbilities -->|Yes| GrantAccess[Grant access]
    
    GrantSuperAdmin --> Success([Access Granted])
    GrantAccess --> Success
    
    ErrorUser --> End([Request Rejected])
    ErrorPredefined --> End
    ErrorForbidden --> End
```

### CASL Integration

The system uses [CASL][casl] (Code Access Security Library) to handle complex permission logic:

**PolicyAbilityFactory:**

- `createForUser()`: Builds CASL ability rules from user's assigned abilities
- `handlerAbilities()`: Validates if user has all required abilities using CASL's `can()` method

**How it works:**

The factory creates a CASL ability instance that can check if a user can perform specific actions on specific subjects. Every required ability must be satisfied for access to be granted.

### Important Notes

- `@PolicyAbilityProtected()` **requires** `@AuthJwtAccessProtected()`, `@RoleProtected()`, and `@UserProtected()` to be applied
- Decorators must be stacked in this order from bottom to top: `@PolicyAbilityProtected()` → `@RoleProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- Incorrect ordering will result in runtime errors
- Users with `superAdmin` role type have unrestricted access to all `@PolicyAbilityProtected` routes, bypassing all ability checks.
- All actions in a required ability must be present in the user's abilities. For example, if you require `[UPDATE, DELETE]` on `USER` subject, the user must have both actions, not just one.

## Term Policy Acceptance Protected

`TermPolicyAcceptanceProtected` validates that users have accepted required legal terms and policies (such as Terms of Service, Privacy Policy, etc.) before allowing access to protected routes. This ensures legal compliance and user consent management.

### Decorators

#### TermPolicyAcceptanceProtected Decorator

**Method decorator** that applies `TermPolicyGuard` to route handlers.

**Parameters:**
- `...requiredTermPolicies` (ENUM_TERM_POLICY_TYPE[], optional): One or more term policy types that must be accepted. If not provided, defaults to `termsOfService` and `privacy`

**Available Term Policy Types:**
- `ENUM_TERM_POLICY_TYPE.termsOfService` - Terms of Service acceptance
- `ENUM_TERM_POLICY_TYPE.privacy` - Privacy Policy acceptance
- `ENUM_TERM_POLICY_TYPE.cookie` - Cookie Policy acceptance
- `ENUM_TERM_POLICY_TYPE.marketing` - Marketing consent acceptance

**Usage:**

```typescript
// Default: requires termsOfService and privacy acceptance
@TermPolicyAcceptanceProtected()
@UserProtected()
@AuthJwtAccessProtected()
@Get('premium-features')
getPremiumFeatures() {
  return this.featureService.getPremiumFeatures();
}

// Single term policy requirement
@TermPolicyAcceptanceProtected(ENUM_TERM_POLICY_TYPE.marketing)
@UserProtected()
@AuthJwtAccessProtected()
@Post('subscribe-newsletter')
subscribeNewsletter(@Body() dto: SubscribeDto) {
  return this.newsletterService.subscribe(dto);
}

// Multiple term policy requirements
@TermPolicyAcceptanceProtected(
  ENUM_TERM_POLICY_TYPE.termsOfService,
  ENUM_TERM_POLICY_TYPE.privacy,
  ENUM_TERM_POLICY_TYPE.cookie
)
@UserProtected()
@AuthJwtAccessProtected()
@Post('data-processing')
processUserData(@Body() dto: ProcessDataDto) {
  return this.dataService.process(dto);
}
```

### Guards

#### `TermPolicyGuard`

The guard implementation that validates user term policy acceptance.

The `TermPolicyAcceptanceProtected` decorator follows this validation sequence:

1. **User Validation**: Verifies that `request.__user` and `request.user` exist
2. **Default Policy Check**: If no required policies specified, sets defaults to `termsOfService` and `privacy`
3. **Term Policy Lookup**: Retrieves user's term policy acceptance status from `__user.termPolicy`
4. **Acceptance Validation**: Checks if all required term policies are accepted
5. **Access Decision**: Grants access only if all required policies are accepted

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate and load user]
    UserGuard --> CheckUser{request.__user and<br/>request.user exist?}
    
    CheckUser -->|No| ErrorUser[Throw ForbiddenException<br/>JWT_ACCESS_TOKEN_INVALID]
    CheckUser -->|Yes| CheckRequired{Required term policies<br/>specified?}
    
    CheckRequired -->|No| SetDefault[Set default policies:<br/>termsOfService and privacy]
    CheckRequired -->|Yes| UseSpecified[Use specified policies]
    
    SetDefault --> GetTermPolicy[Get user.termPolicy<br/>acceptance status]
    UseSpecified --> GetTermPolicy
    
    GetTermPolicy --> CheckAcceptance{All required policies<br/>accepted by user?}
    
    CheckAcceptance -->|No| ErrorRequired[Throw ForbiddenException<br/>REQUIRED_INVALID]
    CheckAcceptance -->|Yes| GrantAccess[Grant access]
    
    GrantAccess --> Success([Access Granted])
    
    ErrorUser --> End([Request Rejected])
    ErrorRequired --> End
```

### Important Notes

- `@TermPolicyAcceptanceProtected()` **requires** `@AuthJwtAccessProtected()` and `@UserProtected()` to be applied
- Decorator order from top to bottom:`@TermPolicyAcceptanceProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- If no term policies are specified, it defaults to requiring `termsOfService` and `privacy` acceptance
- All specified term policies must be accepted by the user for access to be granted
- Incorrect ordering will result in runtime errors
- When `@TermPolicyAcceptanceProtected()` is used without parameters, it automatically requires acceptance of both `termsOfService` and `privacy` policies. This ensures baseline legal compliance for most features.
- All specified term policies must be accepted. If even one required policy is not accepted, access is denied.


<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[casl]: https://casl.js.org/
[ref-nestjs]: http://nestjs.com
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
