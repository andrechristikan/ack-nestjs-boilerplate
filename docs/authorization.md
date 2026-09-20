# Authorization Documentation

Decorator locations:
- **UserProtected**: `src/modules/user/decorators`
- **RoleProtected**: `src/modules/role/decorators`
- **PolicyProtected**: `src/modules/policy/decorators`
- **TermPolicyAcceptanceProtected**: `src/modules/term-policy/decorators`

The workspace and project decorators (`WorkspaceProtected`, `WorkspaceMemberProtected`, `ProjectProtected`, `ProjectMemberProtected`) are summarised here and documented in full by [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

## Overview

Guards stack as: user, role, policy, term-policy acceptance. NestJS applies each layer on the route handler.

## Related Documents

- [Configuration Documentation][ref-doc-configuration] - For Redis configuration settings
- [Environment Documentation][ref-doc-environment] - For Redis environment variables
- [Authentication Documentation][ref-doc-authentication] - JWT, sessions, and API keys
- [Activity Log Documentation][ref-doc-activity-log] - For tracking authorization-related user activities
- [Term Policy Document][ref-doc-term-policy] - For managing user acceptance of terms and policies
- [Device Documentation][ref-doc-device] - For device management and session invalidation
- [Workspace Documentation][ref-doc-workspace] - For the workspace guards, their exceptions, and `x-workspace-id`
- [Project Documentation][ref-doc-project] - For the project guards and the workspace-owner bypass

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Decorator Order](#decorator-order)
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
- [Policy Protected](#policy-protected)
  - [Decorators](#decorators-2)
    - [PolicyProtected() Decorator](#policyprotected-decorator)
  - [Guards](#guards-2)
    - [PolicyGuard](#policyguard)
  - [CASL Integration](#casl-integration)
  - [Important Notes](#important-notes-2)
- [Term Policy Acceptance Protected](#term-policy-acceptance-protected)
  - [Decorators](#decorators-3)
    - [TermPolicyAcceptanceProtected() Decorator](#termpolicyacceptanceprotected-decorator)
  - [Guards](#guards-3)
    - [TermPolicyGuard](#termpolicyguard)
  - [Important Notes](#important-notes-3)
- [Workspace and Project Protected](#workspace-and-project-protected)
- [Creating Custom Roles](#creating-custom-roles)
  - [How to Create a New Role](#how-to-create-a-new-role)
  - [Role Configuration](#role-configuration)
  - [Assigning Roles to Users](#assigning-roles-to-users)
  - [Important Notes](#important-notes-4)

## Decorator Order

NestJS evaluates stacked decorators bottom-up, so the guard NEAREST the method executes FIRST. The order encodes which gate rejects first, so a reshuffle changes the error a caller sees even when the application still boots. Every route uses this order, top to bottom in source (the constraint when changing it: `.claude/rules/http.md`):

```typescript
@ExampleDoc()                              // 1.  Swagger doc factory
@Response('example.action')                // 2.  @Response / @ResponsePaging / @ResponseFile
@TermPolicyAcceptanceProtected()           // 3.  Term policy acceptance
@PolicyProtected({ ... })           // 4.  CASL policy ability
@RoleProtected(EnumRoleType.admin)         // 5.  Role type
@ProjectMemberProtected(...)               // 6.  Project member role
@ProjectProtected()                        // 7.  Project resolution from :projectId
@WorkspaceMemberProtected(...)             // 8.  Workspace member role
@WorkspaceProtected()                      // 9.  Workspace resolution from x-workspace-id
@UserProtected()                           // 10. User status
@FeatureFlagProtected('exampleKey')        // 11. Feature flag
@AuthJwtAccessProtected()                  // 12. JWT access or refresh
@ApiKeyProtected()                         // 13. API key
@HttpCode(HttpStatus.OK)                   // 14. HTTP status, only when it differs from the default
@Get('/endpoint')                          // 15. HTTP method, always last
```

A route takes only the slots it needs; the relative order of the ones it takes never changes. Guard execution therefore runs `@ApiKeyProtected()` → `@AuthJwtAccessProtected()` → `@FeatureFlagProtected()` → `@UserProtected()` → `@WorkspaceProtected()` → `@WorkspaceMemberProtected()` → `@ProjectProtected()` → `@ProjectMemberProtected()` → `@RoleProtected()` → `@PolicyProtected()` → `@TermPolicyAcceptanceProtected()`.

- A social-login guard (`@AuthSocialGoogleProtected()`) takes the JWT slot for that route.
- `@RequestThrottle({ ... })` sits outside this order. It mounts an interceptor, so it runs after every guard whatever its position in the stack. Routes declare it below `@ApiKeyProtected()`, so the rate limit reads next to the guards protecting the same route. See [Security and Middleware][ref-doc-security-and-middleware].
- Activity logging takes no slot. Domains build events with `ActivityLogDomain.prepare` and queue them with `ActivityLogDomain.stagePrepared`, and the global `ActivityLogInterceptor` writes them after the handler settles. See [Activity Log][ref-doc-activity-log].
- A guard that depends on state an earlier guard sets sits ABOVE that guard in source, so it runs after it.
- `@FeatureFlagProtected()` sits ABOVE `@AuthJwtAccessProtected()` so the flag guard sees `request.user`. Below it the guard always takes its anonymous branch, which makes `targetUserIds` and any rollout below 100% inert on that route.
- The workspace and project slots are used by the `/user` scope. The `/admin` scope reaches the same resources through `@RoleProtected()` + `@PolicyProtected()` instead, and takes the workspace or project id from the path.

## User Protected

`UserProtected` applies `UserGuard`, which reads the JWT `userId` and loads the user. Email verification defaults to on.

### Decorators

#### UserProtected Decorator

**Method decorator** that applies `UserGuard` to route handlers.

**Parameters:**
- `isVerified` (boolean, optional): Whether to require email verification. Default: `true`

**Usage:**

`@UserProtected()` requires email verification. `@UserProtected(false)` skips that check. The default is `true`. Shared profile:

```typescript
@TermPolicyAcceptanceProtected()
@UserProtected()
@AuthJwtAccessProtected()
@Get('/profile/get')
async profile(
  @AuthJwtPayload('userId') userId: string
): Promise<IResponseReturn<IUserProfile>> {
  return this.userProfileHttpService.getProfile(userId);
}
```

#### UserCurrent Parameter Decorator

Reads back the authenticated user `UserGuard` stored, or one of its fields when a field name is passed.

**Returns:** `IUser`, or the named field of it. Both are non-null: an empty store key, or a field holding `null`, throws `RequestContextMissingException` (500, `50304`).

**Usage:**

Refresh is a call site:

```typescript
@UserProtected()
@AuthJwtRefreshProtected()
@Post('/refresh')
async refresh(
  @UserCurrent() user: IUser,
  @AuthJwtToken() refreshToken: string
): Promise<IResponseReturn<IAuthToken>> {
  return this.userAuthHttpService.refresh(user, refreshToken);
}
```

### Guards

#### `UserGuard`

The guard implementation that performs the actual validation.

The `UserProtected` decorator follows this validation sequence:

1. **Authentication Check**: Verifies that the JWT strategy put a `userId` on `request.user`
2. **User Lookup**: Retrieves user from database with role information
3. **User Existence**: Ensures user record exists
4. **Blocked Check**: Rejects a user whose status is `blocked`
5. **Status Validation**: Confirms user status is `active`
6. **Password Expiry**: Checks if password has expired
7. **Email Verification**: Validates email verification if required

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT and populate request.user]
    JwtGuard --> CheckAuth{request.user.userId present?}
    CheckAuth -->|No| ErrorAuth[Throw UserNotAuthenticatedException<br/>401 Unauthorized]
    CheckAuth -->|Yes| LookupUser[Retrieve user from database<br/>with role information]
    
    LookupUser --> UserExists{User exists<br/>in database?}
    UserExists -->|No| ErrorNotFound[Throw UserNotFoundForbiddenException<br/>403 Forbidden]
    UserExists -->|Yes| CheckBlocked{User status<br/>is blocked?}
    
    CheckBlocked -->|Yes| ErrorBlocked[Throw UserBlockedForbiddenException<br/>403 Forbidden]
    CheckBlocked -->|No| CheckStatus{User status<br/>is active?}
    
    CheckStatus -->|No| ErrorInactive[Throw UserInactiveForbiddenException<br/>403 Forbidden]
    CheckStatus -->|Yes| CheckPassword{Password<br/>expired?}
    
    CheckPassword -->|Yes| ErrorPassword[Throw UserPasswordExpiredException<br/>403 Forbidden]
    CheckPassword -->|No| CheckVerified{isVerified required<br/>AND user not verified?}
    
    CheckVerified -->|Yes| ErrorVerified[Throw UserEmailNotVerifiedException<br/>403 Forbidden]
    CheckVerified -->|No| SetUser[Store user via<br/>RequestStoreService.set UserStoreKey, user]
    
    SetUser --> Success([Access Granted])
    
    ErrorAuth --> End([Request Rejected])
    ErrorNotFound --> End
    ErrorBlocked --> End
    ErrorInactive --> End
    ErrorPassword --> End
    ErrorVerified --> End
```

### Important Notes

- `@UserProtected()` requires `@AuthJwtAccessProtected()` to run first, so JWT sits below `@UserProtected()` in source (nearest the method). Nest runs guards bottom-up.
- `@AuthJwtAccessProtected()` populates `request.user` from JWT token. See [Authentication Documentation][ref-doc-authentication] for details
- This decorator stores the validated user via `RequestStoreService.set(UserStoreKey, user)` (read back with `RequestStoreService.get(UserStoreKey)`, e.g. by `@UserCurrent()`), which is required by downstream guards

## Role Protected

`RoleProtected` is RBAC: `RoleGuard` accepts only a role type listed on the decorator.

### Decorators

#### RoleProtected Decorator

**Method decorator** that applies `RoleGuard` to route handlers.

**Parameters:**
- `...requiredRoles` (EnumRoleType[]): One or more role types required to access the route

**Available Role Types:**
- `EnumRoleType.superAdmin` - Super administrator with unrestricted access
- `EnumRoleType.admin` - Administrator role
- `EnumRoleType.user` - Standard user role

**Usage:**

```typescript
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Get('/list')
async list(
  @PaginationOffsetQuery({
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
  })
  pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
  return this.userHttpService.getListOffsetByAdmin(pagination);
}
```

The decorator accepts more than one type (`@RoleProtected(EnumRoleType.admin, EnumRoleType.user)`). The caller needs one of the listed types. Admin user routes in this checkout pass `EnumRoleType.admin` alone.

**`superAdmin` is absent from every `@RoleProtected()` list.** The guard returns before the required-role list is read for a `superAdmin`, so listing it would grant nothing.

### Getting Current Role

To access the current user's role, use the `@UserCurrent()` decorator and access the `role` property:

`@UserCurrent()` returns the stored `IUser`. The role on that object is what `UserGuard` loaded: `user.role.type`, `user.role.name`, and `user.role.policies`.

### Guards

#### `RoleGuard`

The guard implementation that validates user roles and stashes the role's policies.

The `RoleProtected` decorator follows this validation sequence:

1. **User Validation**: Verifies that the stored user (`RequestStoreService.get(UserStoreKey)`) exists
2. **Super Admin Bypass**: If user role is `superAdmin`, grants immediate access with an empty policy array
3. **Required Roles Check**: Validates that required roles are defined
4. **Role Match**: Confirms user's role type matches one of the required roles
5. **Policy Population**: Stores `role.policies` via `RequestStoreService.set(PolicyStoreKey, policies)` for downstream use

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate and load user]
    UserGuard --> CheckUser{Stored user UserStoreKey<br/>exists?}
    
    CheckUser -->|No| ErrorUser[Throw AuthJwtAccessTokenInvalidException<br/>401 Unauthorized]
    CheckUser -->|Yes| CheckSuperAdmin{User role is<br/>superAdmin?}
    
    CheckSuperAdmin -->|Yes| GrantSuperAdmin[Grant access with<br/>empty policy array]
    CheckSuperAdmin -->|No| CheckRequired{Required roles<br/>defined?}
    
    CheckRequired -->|No| ErrorPredefined[Throw RolePredefinedNotFoundException<br/>500 Internal Server Error]
    CheckRequired -->|Yes| CheckRoleMatch{User role matches<br/>required roles?}
    
    CheckRoleMatch -->|No| ErrorForbidden[Throw RoleForbiddenException<br/>403 Forbidden]
    CheckRoleMatch -->|Yes| SetAbilities[Store policies via<br/>RequestStoreService.set PolicyStoreKey, policies]
    
    GrantSuperAdmin --> Success([Access Granted])
    SetAbilities --> Success
    
    ErrorUser --> End([Request Rejected])
    ErrorPredefined --> End
    ErrorForbidden --> End
```

### Important Notes

- `@RoleProtected()` reads the user `@UserProtected()` stored, which in turn depends on `@AuthJwtAccessProtected()`
- The stack reads top to bottom `@RoleProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- This decorator stores the role's policies via `RequestStoreService.set(PolicyStoreKey, policies)` (read back with `RequestStoreService.get(PolicyStoreKey)`), which is what `PolicyGuard` evaluates
- Without a stored user the guard throws `AuthJwtAccessTokenInvalidException` (401)
- Users with `superAdmin` role type have unrestricted access to all `@RoleProtected` routes, regardless of the specified required roles. The guard returns an empty policy array for super admins, as they bypass the policy check.


## Policy Protected

`PolicyProtected` is CASL. A policy names an action (`read`, `create`, `update`, `delete`, `manage`) on a subject (`user`, `role`, `session`, and the rest of `EnumPolicySubject`).

### Decorators

#### PolicyProtected Decorator

**Method decorator** that applies `PolicyGuard` to route handlers.

**Parameters:**
- `...requiredPolicies` (PolicyRequestDto[]): One or more `{ subject, action[] }` objects naming the required permissions

**Available Policy Actions:**
- `EnumPolicyAction.manage` - Full control over a subject
- `EnumPolicyAction.read` - Read/view permission
- `EnumPolicyAction.create` - Create new resources
- `EnumPolicyAction.update` - Modify existing resources
- `EnumPolicyAction.delete` - Remove resources

**Available Policy Subjects:**
- `EnumPolicySubject.all` - All resources
- `EnumPolicySubject.apiKey` - API key management
- `EnumPolicySubject.role` - Role management
- `EnumPolicySubject.user` - User management
- `EnumPolicySubject.session` - Session management
- `EnumPolicySubject.activityLog` - Activity logs
- `EnumPolicySubject.passwordHistory` - Password history
- `EnumPolicySubject.termPolicy` - Terms and policies
- `EnumPolicySubject.featureFlag` - Feature flags
- `EnumPolicySubject.device` - Device management
- `EnumPolicySubject.workspace` - Workspace management
- `EnumPolicySubject.project` - Project management
- `EnumPolicySubject.analytic` - Admin analytic dashboard, anomaly, and fraud read routes

**Usage:**

```typescript
@PolicyProtected({
  subject: EnumPolicySubject.user,
  action: [EnumPolicyAction.read]
})
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Get('/list')
async list(
  @PaginationOffsetQuery({
    availableSearch: UserDefaultAvailableSearch,
    availableOrderBy: UserDefaultAvailableOrderBy,
  })
  pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
): Promise<IResponsePagingReturn<UserListResponseDto>> {
  return this.userHttpService.getListOffsetByAdmin(pagination);
}

@PolicyProtected({
  subject: EnumPolicySubject.user,
  action: [EnumPolicyAction.read, EnumPolicyAction.update]
})
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Patch('/update/:userId/status')
async updateStatus(
  @Param('userId', { schema: RequestUuidSchema }) userId: string,
  @AuthJwtPayload('userId') updatedBy: string,
  @Body({ schema: UserUpdateStatusRequestSchema }) body: UserUpdateStatusRequestDto
): Promise<IResponseReturn<void>> {
  return this.userHttpService.updateStatusByAdmin(userId, body, updatedBy);
}

@PolicyProtected(
  {
    subject: EnumPolicySubject.user,
    action: [EnumPolicyAction.read]
  },
  {
    subject: EnumPolicySubject.session,
    action: [EnumPolicyAction.read, EnumPolicyAction.delete]
  }
)
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@Delete('/revoke/:sessionId')
async revoke(
  @Param('userId', { schema: RequestUuidSchema }) userId: string,
  @Param('sessionId', { schema: RequestUuidSchema }) sessionId: string,
  @AuthJwtPayload('userId') revokedBy: string
): Promise<IResponseReturn<void>> {
  return this.sessionHttpService.revokeByAdmin(userId, sessionId, revokedBy);
}
```

### Guards

#### `PolicyGuard`

The guard reads the user and the stored policies off the request store and hands both to `PolicyDomain.validatePolicyGuard`, which evaluates them through CASL.

The `PolicyProtected` decorator follows this validation sequence:

1. **User Validation**: Verifies that the stored user (`RequestStoreService.get(UserStoreKey)`) exists
2. **Super Admin Bypass**: If user role is `superAdmin`, grants immediate access
3. **Required Policies Check**: Validates that required policies are declared on the handler
4. **Ability Creation**: Creates CASL ability rules from the stored policies (`RequestStoreService.get(PolicyStoreKey)`)
5. **Permission Validation**: Checks that every required `(subject, action)` pair is allowed
6. **Access Decision**: Grants or denies access based on permission match

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate and load user]
    UserGuard --> RoleGuard[ @RoleProtected<br/>Validate role and load abilities]
    RoleGuard --> CheckUser{Stored user UserStoreKey<br/>exists?}
    
    CheckUser -->|No| ErrorUser[Throw AuthJwtAccessTokenInvalidException<br/>401 Unauthorized]
    CheckUser -->|Yes| CheckSuperAdmin{User role is<br/>superAdmin?}
    
    CheckSuperAdmin -->|Yes| GrantSuperAdmin[Grant immediate access]
    CheckSuperAdmin -->|No| CheckRequired{Required abilities<br/>defined?}
    
    CheckRequired -->|No| ErrorPredefined[Throw PolicyPredefinedNotFoundException<br/>500 Internal Server Error]
    CheckRequired -->|Yes| CreateAbilities[Create CASL ability rules<br/>from RequestStoreService.get PolicyStoreKey]
    
    CreateAbilities --> ValidateAbilities{All required abilities<br/>present in user abilities?}
    
    ValidateAbilities -->|No| ErrorForbidden[Throw PolicyForbiddenException<br/>403 Forbidden]
    ValidateAbilities -->|Yes| GrantAccess[Grant access]
    
    GrantSuperAdmin --> Success([Access Granted])
    GrantAccess --> Success
    
    ErrorUser --> End([Request Rejected])
    ErrorPredefined --> End
    ErrorForbidden --> End
```

### CASL Integration

The project uses [CASL][casl] for permission checks:

**PolicyAbilityFactory:**

- `createForUser(policies)`: Builds CASL ability rules from the role's stored policies
- `handlerPolicies(userPolicies, policies)`: Returns true only when every required action on each subject is allowed, using CASL's `can()`

### Important Notes

- `@PolicyProtected()` reads the policies `@RoleProtected()` stored and the user `@UserProtected()` stored, both of which depend on `@AuthJwtAccessProtected()`
- The stack reads top to bottom `@PolicyProtected()` → `@RoleProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- Without a stored user the guard throws `AuthJwtAccessTokenInvalidException` (401)
- Users with `superAdmin` role type have unrestricted access to all `@PolicyProtected` routes, bypassing all ability checks.
- Every action of a required policy has to be present in the user's policies. Requiring `[EnumPolicyAction.update, EnumPolicyAction.delete]` on the `EnumPolicySubject.user` subject grants access only when the user holds both actions, not just one.

## Term Policy Acceptance Protected

`TermPolicyAcceptanceProtected` rejects the request until the user has accepted the required policies (Terms of Service, Privacy Policy, and the rest of the set).

For more detailed information about term policies, see [Term Policy Document][ref-doc-term-policy].

### Decorators

#### TermPolicyAcceptanceProtected Decorator

**Method decorator** that applies `TermPolicyGuard` to route handlers.

**Parameters:**
- `...requiredTermPolicies` (EnumTermPolicyType[], optional): One or more term policy types that must be accepted. If not provided, defaults to `termsOfService` and `privacy`

**Available Term Policy Types:**
- `EnumTermPolicyType.termsOfService` - Terms of Service acceptance
- `EnumTermPolicyType.privacy` - Privacy Policy acceptance
- `EnumTermPolicyType.cookies` - Cookies Policy acceptance
- `EnumTermPolicyType.marketing` - Marketing consent acceptance

**Usage:**

```typescript
@TermPolicyAcceptanceProtected()
@UserProtected()
@AuthJwtAccessProtected()
@Get('/acceptance/list')
async listAccepted(
  @PaginationCursorQuery({
    availableOrderBy: TermPolicyAcceptanceDefaultAvailableOrderBy,
  })
  pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>,
  @AuthJwtPayload('userId') userId: string
): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
  return this.termPolicyAcceptanceHttpService.getListUserAccepted(
    userId,
    pagination
  );
}
```

The decorator takes optional `EnumTermPolicyType` arguments. With none, it requires `termsOfService` and `privacy`. Shared and admin routes in this checkout pass no arguments.

### Guards

#### `TermPolicyGuard`

The guard implementation that validates user term policy acceptance.

The `TermPolicyAcceptanceProtected` decorator follows this validation sequence:

1. **User Validation**: Verifies that the stored user (`RequestStoreService.get(UserStoreKey)`) exists
2. **Default Policy Check**: If no required policies specified, sets defaults to `termsOfService` and `privacy`
3. **Term Policy Lookup**: Reads the required acceptance columns from the stored user (`termsOfServiceAccepted`, `privacyAccepted`, `cookiesAccepted`, or `marketingAccepted`)
4. **Acceptance Validation**: Checks if all required term policies are accepted
5. **Access Decision**: Grants access only if all required policies are accepted

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate and load user]
    UserGuard --> CheckUser{Stored user UserStoreKey<br/>exists?}
    
    CheckUser -->|No| ErrorUser[Throw AuthJwtAccessTokenInvalidException<br/>401 Unauthorized]
    CheckUser -->|Yes| CheckRequired{Required term policies<br/>specified?}
    
    CheckRequired -->|No| SetDefault[Set default policies:<br/>termsOfService and privacy]
    CheckRequired -->|Yes| UseSpecified[Use specified policies]
    
    SetDefault --> GetTermPolicy[Read required User<br/>acceptance columns]
    UseSpecified --> GetTermPolicy
    
    GetTermPolicy --> CheckAcceptance{All required policies<br/>accepted by user?}
    
    CheckAcceptance -->|No| ErrorRequired[Throw TermPolicyRequiredInvalidException<br/>403 Forbidden]
    CheckAcceptance -->|Yes| GrantAccess[Grant access]
    
    GrantAccess --> Success([Access Granted])
    
    ErrorUser --> End([Request Rejected])
    ErrorRequired --> End
```

### Important Notes

- `@TermPolicyAcceptanceProtected()` reads the user `@UserProtected()` stored, which depends on `@AuthJwtAccessProtected()`
- Decorator order from top to bottom: `@TermPolicyAcceptanceProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`
- For more details about `@AuthJwtAccessProtected()`, see [Authentication Documentation][ref-doc-authentication]
- Without the required decorators the stored user is never populated, so the guard throws `AuthJwtAccessTokenInvalidException` (401 Unauthorized)
- If no term policies are specified, it defaults to requiring `termsOfService` and `privacy` acceptance
- Access is granted only when the user has accepted every specified term policy

## Workspace and Project Protected

Four decorators scope a `/user` request to one workspace and, inside it, to one project. They occupy slots 6-9 of the stack above and are documented in full by the modules that own them.

| Decorator | Guards it binds | Selects the resource from |
|---|---|---|
| `@WorkspaceProtected()` | `WorkspaceGuard` | The `x-workspace-id` header |
| `@WorkspaceMemberProtected(...roles)` | `WorkspaceMemberGuard`, plus `WorkspaceRoleGuard` when roles are given | The membership of the resolved workspace |
| `@ProjectProtected()` | `ProjectGuard` | The `:projectId` route param, constrained to the resolved workspace |
| `@ProjectMemberProtected(...roles)` | `ProjectMemberGuard` with no arguments, `ProjectRoleGuard` with roles | The membership of the resolved project |

Three properties matter wherever these appear:

- **Each guard reads what the previous one stored and never re-fetches or re-authenticates.** Dropping one from the stack leaves the next reading an empty store key, which surfaces as a `notFound` or `forbidden` rather than a crash.
- **A workspace `owner` is privileged.** It satisfies every workspace role, and it reaches every project in the workspace without holding a `ProjectMember` row.
- **The `/admin` scope takes none of them.** Admin routes reach the same resources through `@RoleProtected()` + `@PolicyProtected()` and take the workspace or project id from the path.

For the guard bodies, the exceptions and status codes each one throws, the store keys, and the `@WorkspaceCurrent()` / `@ProjectCurrent()` parameter decorators, see [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

## Creating Custom Roles

The boilerplate supports creating custom roles through the role management API. A role carries a set of policies, each naming one subject and the actions allowed on it.

A custom role is any role other than `superAdmin`, `admin`, and `user`. Examples: ContentModerator, Accountant, CustomerSupport. Each role carries its own policies.

### How to Create a New Role

A role and its policies are two separate admin surfaces: `POST /admin/role/create` creates the role, and `POST /admin/role/:roleId/policy/create` attaches one policy to it. The API documentation is available in your Swagger docs at `/docs`.

**Basic steps:**

1. Authenticate as an admin user
2. Call the role creation endpoint with name, type, and description
3. Call the policy creation endpoint once per subject the role may reach
4. The role is available for assignment to users as soon as it exists

**Example role creation request** (`POST /admin/role/create`):

```json
{
  "name": "contentmoderator",
  "description": "Role for moderating user-generated content",
  "type": "admin"
}
```

**Example policy creation request** (`POST /admin/role/:roleId/policy/create`), one call per subject:

```json
{
  "subject": "user",
  "action": ["read", "update"]
}
```

### Role Configuration

**Role Properties:**

- **name**: Unique identifier for the role (alphanumeric, lowercase, 3-30 characters)
- **description**: Optional description explaining the role's purpose (max 500 characters)
- **type**: Role type from `EnumRoleType` (superAdmin, admin, or user)

**Policy Structure:**

Each policy row consists of:
- **subject**: The resource type (e.g., user, role, apiKey, session, termPolicy, activityLog, analytic)
- **action**: Array of allowed actions (manage, read, create, update, delete)

A role holds at most one policy per subject: creating a second policy for a subject already covered is rejected.

**Available subjects and actions are defined in:**
- `EnumPolicySubject`: all, apiKey, role, user, session, activityLog, passwordHistory, termPolicy, featureFlag, device, workspace, project, analytic
- `EnumPolicyAction`: manage, read, create, update, delete

### Assigning Roles to Users

Once a custom role is created, it can be assigned to users through:

1. **User creation**: Specify the `roleId` when creating new users
2. **User update**: Update existing users to assign them the new role

**How it works automatically:**

- When a user is assigned a role, they immediately inherit every policy attached to that role
- The `RoleGuard` loads the user's role and its policies during the request
- The `PolicyGuard` validates permissions based on the role's policies
- No application restart or additional configuration is needed

**Permission enforcement flow:**

```mermaid
flowchart LR
    User[User logs in] --> LoadRole[Role & policies loaded<br/>from database]
    LoadRole --> RoleGuard[RoleGuard validates<br/>role type]
    RoleGuard --> PolicyGuard[PolicyGuard validates<br/>specific permissions]
    PolicyGuard --> Access[Access granted/denied<br/>based on policies]
```

### Important Notes

- **Role names are unique**: creating a second role with an existing name is rejected
- **A role in use cannot be deleted**: deletion is rejected (`RoleUsedException`) while any user holds the role


<!-- REFERENCES -->

[casl]: https://casl.js.org/

[ref-doc-authentication]: authentication.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-device]: device.md
[ref-doc-workspace]: workspace.md
[ref-doc-project]: project.md
