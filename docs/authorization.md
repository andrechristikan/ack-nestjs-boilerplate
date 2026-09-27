# Authorization Documentation

Decorator locations:

- **UserProtected**: `src/modules/user/decorators`
- **PolicyProtected**: `src/modules/policy/decorators`
- **TermPolicyAcceptanceProtected**: `src/modules/term-policy/decorators`

The workspace and project decorators (`WorkspaceProtected`, `WorkspaceMemberProtected`, `ProjectProtected`, `ProjectMemberProtected`) are summarised here and documented in full by [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

## Overview

Authorization is CASL only. Guards stack as:

- user (loads the platform role's policies)
- workspace and project membership (each adds the policies of the member's role)
- policy (decides)
- term-policy acceptance

NestJS applies each layer on the route handler. A role decides nothing by itself: it is a named set of policies, and `PolicyGuard` evaluates the policies the earlier guards collected.

## Related Documents

- [Authentication Documentation][ref-doc-authentication] - JWT, sessions, and API keys
- [Activity Log Documentation][ref-doc-activity-log] - Authz-related activity rows
- [Term Policy Documentation][ref-doc-term-policy] - Acceptance gating
- [Device Documentation][ref-doc-device] - Device revoke and sessions
- [Workspace Documentation][ref-doc-workspace] - Workspace guards and `x-workspace-id`
- [Project Documentation][ref-doc-project] - Project guards and project roles
- [Feature Flag Documentation][ref-doc-feature-flag] - `@FeatureFlagProtected` in the stack
- [Security and Middleware Documentation][ref-doc-security-and-middleware] - Rate limits and headers

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
- [Roles and the Policy Store](#roles-and-the-policy-store)
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
- [Role Catalog and Policies](#role-catalog-and-policies)
  - [Role Catalog](#role-catalog)
  - [Managing Roles and Policies](#managing-roles-and-policies)
  - [Assigning Roles](#assigning-roles)
  - [Important Notes](#important-notes-4)

## Decorator Order

NestJS evaluates stacked decorators bottom-up, so the guard NEAREST the method executes FIRST. The order encodes which gate rejects first, so a reshuffle changes the error a caller sees even when the application still boots. Every route uses this order, top to bottom in source:

```typescript
@Doc({ summary: '…' })                     // 1.  OpenAPI operation + global error kit
@Response('example.action')                // 2.  @Response / @ResponsePagination / @ResponseFile
@TermPolicyAcceptanceProtected()           // 3.  Term policy acceptance
@PolicyProtected({ ... })                  // 4.  CASL policy ability
@ProjectMemberProtected(...)               // 5.  Project role policies
@ProjectProtected()                        // 6.  Project resolution from :projectId
@WorkspaceMemberProtected()                // 7.  Workspace role policies
@WorkspaceProtected()                      // 8.  Workspace resolution from x-workspace-id
@UserProtected()                           // 9.  User status and platform role policies
@FeatureFlagProtected('exampleKey')        // 10. Feature flag
@AuthJwtAccessProtected()                  // 11. JWT access or refresh
@ApiKeyProtected()                         // 12. API key
@HttpCode(HttpStatus.OK)                   // 13. HTTP status, only when it differs from the default
@Get('/endpoint')                          // 14. HTTP method, always last
```

A route takes only the slots it needs; the relative order of the ones it takes never changes. Guard execution therefore runs `@ApiKeyProtected()` → `@AuthJwtAccessProtected()` → `@FeatureFlagProtected()` → `@UserProtected()` → `@WorkspaceProtected()` → `@WorkspaceMemberProtected()` → `@ProjectProtected()` → `@ProjectMemberProtected()` → `@PolicyProtected()` → `@TermPolicyAcceptanceProtected()`.

- A social-login guard (`@AuthSocialGoogleProtected()`) takes the JWT slot for that route.
- `@RequestThrottle({ ... })` sits outside this order. It mounts an interceptor, so it runs after every guard whatever its position in the stack. Routes declare it below `@ApiKeyProtected()`, so the rate limit reads next to the guards protecting the same route. See [Security and Middleware][ref-doc-security-and-middleware].
- Activity logging takes no slot. Domains build events with `ActivityLogDomain.prepare` and queue them with `ActivityLogDomain.stagePrepared`, and the global `ActivityLogInterceptor` writes them after the handler settles. See [Activity Log][ref-doc-activity-log].
- A guard that depends on state an earlier guard sets sits ABOVE that guard in source, so it runs after it.
- `@FeatureFlagProtected()` sits ABOVE `@AuthJwtAccessProtected()` so the flag guard sees `request.user`. Below it the guard always takes its anonymous branch, which makes `targetUserIds` and any rollout below 100% inert on that route.
- The workspace and project slots are used by the `/user` scope. The `/admin` scope reaches the same resources through `@PolicyProtected()` alone, which evaluates the caller's platform role policies, and takes the workspace or project id from the path.

## User Protected

`UserProtected` applies `UserGuard`, which reads the JWT `userId`, loads the user with its platform role, and stores the role's policies in the policy store. Email verification defaults to on.

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
8. **Policy Store**: Stores the user's platform role policies under `PolicyStoreKey`

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
    CheckVerified -->|No| SetUser[Store user under UserStoreKey<br/>and role policies under PolicyStoreKey]
    
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
- This decorator stores the validated user via `RequestStoreService.set(UserStoreKey, user)` (read back with `RequestStoreService.get(UserStoreKey)`, e.g. by `@UserCurrent()`) and the platform role's policies via `RequestStoreService.set(PolicyStoreKey, user.role.policies)`; `PolicyStoreKey` holds platform policies only

## Roles and the Policy Store

One `Role` model covers every level. A role has a `scope` (`platform`, `workspace`, or `project`), an immutable `key`, and a `name` and `description` an admin edits. The pair `(scope, key)` is unique. The role a user, a workspace member, or a project member holds is a foreign key (`roleId`) to that model, and each role owns the policies that define what it may do.

No decorator gates a route by role. The role reaches a route through the policy store: arrays of `Policy` rows kept in the request store under one key per scope, which `PolicyDomain` composes into one CASL ability.

| Guard | Store key written |
|---|---|
| `UserGuard` | `PolicyStoreKey`: the policies of the user's platform role |
| `WorkspaceMemberGuard` | `WorkspaceMemberPolicyStoreKey`: the policies of the member's workspace role |
| `ProjectMemberGuard` | `ProjectMemberPolicyStoreKey`: the policies of the member's project role |
| `PolicyGuard` | Asks `PolicyDomain`, which reads the three keys, builds the ability once, and stores it under `PolicyAbilityStoreKey` |

`PolicyDomain.buildForRequest` composes `[...platform, ...workspace, ...project]`, each key contributing only when its guard ran. Within a role the rules run in ascending `priority`. CASL gives a later rule precedence over an earlier one, so a workspace rule overrides a platform rule and a project rule overrides both. The ability is built lazily on the first permission check of the request and reused for every later check in that request.

```mermaid
flowchart TD
    User[UserGuard<br/>platform role policies] --> Route{Route scope}
    Route -->|/admin| Policy[PolicyGuard]
    Route -->|/user workspace| WS[WorkspaceMemberGuard<br/>workspace role policies stored]
    WS --> PM{Project route?}
    PM -->|No| Policy
    PM -->|Yes| PG[ProjectMemberGuard<br/>project role policies stored]
    PG --> Policy
```

Reading the current role: `@UserCurrent()` returns the stored `IUser`, whose `role` carries `id`, `scope`, `key`, `name`, and `policies`. `@WorkspaceMemberCurrent()` returns the workspace member with its role (`id`, `scope`, `key`, `name`, no policies). `@ProjectMemberCurrent()` returns the project member with its role (`id`, `scope`, `key`, `name`, no policies).

A domain that has to branch on a capability calls `PolicyDomain.can(action, input)`, which answers `true` or `false` from the current request's ability. `input` is a subject, or `{ subject, record }` to test the rule conditions against one record. An action the subject registry does not enforce for that subject answers `false`. `PolicyDomain.assertCan(action, input)` throws `PolicyForbiddenException` (403, `51100`) instead.

`superAdmin` holds a persisted policy `manage` on `all`. That row is what lets it pass every `PolicyGuard`, and the policies of the `superAdmin` role cannot be created, updated, or deleted (`PolicyImmutableException`, 403, `51104`). The platform `admin` role holds an explicit subject list, not `all`.

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
- `EnumPolicySubject.analytic` - Admin analytic dashboard, anomaly, and fraud read routes, and the workspace analytic routes
- `EnumPolicySubject.workspaceMember` - Workspace member role change and removal
- `EnumPolicySubject.workspaceInvite` - Workspace invite create, resend, and revoke
- `EnumPolicySubject.workspaceJoinRequest` - Workspace join request accept and reject
- `EnumPolicySubject.projectMember` - Project member assign, role change, and removal

**Usage:**

```typescript
@PolicyProtected({
  subject: EnumPolicySubject.user,
  action: [EnumPolicyAction.read]
})
@UserProtected()
@AuthJwtAccessProtected()
@Get('/list')
async list(
  @Query({ schema: UserListRequestSchema }) query: UserListRequestDto
): Promise<IResponsePaginationReturn<IUserList>> {
  return this.userHttpService.getListOffsetByAdmin(query);
}

@PolicyProtected({
  subject: EnumPolicySubject.user,
  action: [EnumPolicyAction.read, EnumPolicyAction.update]
})
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

The guard reads the stored user before anything else, then the handler's required policies, and calls `PolicyDomain.assertCan` for each required `(subject, action)` pair against the request's ability. Reading the stored user here duplicates a check the auth guard chain already performs; the guard keeps it as defense-in-depth on this auth-adjacent gate.

The `PolicyProtected` decorator follows this validation sequence:

1. **Stored User Check**: Reads the user `UserGuard` stored under `UserStoreKey`; a missing entry throws `AuthJwtAccessTokenInvalidException`
2. **Required Policies Check**: Validates that required policies are declared on the handler
3. **Ability Resolution**: `PolicyDomain.getCurrentAbility()` returns the stored ability, or builds it from the platform, workspace, and project policies on the first call
4. **Permission Validation**: `PolicyDomain.assertCan` checks each required `(subject, action)` pair against the subject registry and the ability
5. **Access Decision**: Grants access, or throws `PolicyForbiddenException` on the first pair that is denied

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate user, store platform policies]
    UserGuard --> Members[ Workspace and project member guards<br/>replace or extend the stored policies]
    Members --> CheckStoredUser{Stored user UserStoreKey<br/>present?}

    CheckStoredUser -->|No| ErrorAuth[Throw AuthJwtAccessTokenInvalidException<br/>401 Unauthorized]
    CheckStoredUser -->|Yes| CheckRequired{Required abilities<br/>defined?}

    CheckRequired -->|No| ErrorPredefined[Throw PolicyPredefinedNotFoundException<br/>500 Internal Server Error]
    CheckRequired -->|Yes| CreateAbilities[Get the request ability<br/>PolicyDomain.getCurrentAbility]

    CreateAbilities --> ValidateAbilities{Registry enforces and ability<br/>allows every required action?}

    ValidateAbilities -->|No| ErrorForbidden[Throw PolicyForbiddenException<br/>403 Forbidden]
    ValidateAbilities -->|Yes| GrantAccess[Grant access]

    GrantAccess --> Success([Access Granted])

    ErrorAuth --> End([Request Rejected])
    ErrorPredefined --> End
    ErrorForbidden --> End
```

### CASL Integration

The project uses [CASL][casl] with `@casl/prisma`. The ability is a typed Prisma ability created by `createPrismaAbility`, so a stored condition is a Prisma where-input.

**Rule model.** A `Policy` row is one ordered rule:

| Field | Meaning |
|---|---|
| `subject` | A value of `EnumPolicySubject`. It maps onto the Prisma model of the same name; `all` and `analytic` have no model |
| `action` | One or more of `manage`, `read`, `create`, `update`, `delete` |
| `conditions` | A Prisma where-input as JSON, or `null` for the whole subject |
| `inverted` | `true` makes the rule a CASL `cannot` |
| `reason` | Optional text (max 500) carried by an inverted rule |
| `priority` | Integer of 1 or more. Evaluation order within the role, lowest first. `(roleId, priority)` is unique |

**PolicyAbilityFactory:**

- `build(rules)`: Creates the Prisma ability from ordered ability rules. An inverted rule becomes a `cannot` carrying its reason

**PolicyDomain:**

- `buildForRequest(context)`: Composes the platform, workspace, and project rules, resolves placeholders, builds the ability, and stores it under `PolicyAbilityStoreKey`
- `getCurrentAbility()`: The stored ability, or one built from the guards' store entries on first use
- `can(action, input)` and `assertCan(action, input)`: A boolean check and a throwing check against the subject registry and the current ability. `input` is an `EnumPolicySubject` or `{ subject, record }`
- `createByAdmin` and `updateByAdmin`: Validate the rule inline before it is stored (see Write rules)

**Subject registry.** `PolicySubjectRegistry` in `src/modules/policy/constants/policy.constant.ts` holds one entry for each of the 17 `EnumPolicySubject` values:

| Field | Meaning |
|---|---|
| `modelName` | The CASL subject type: the Prisma model of the subject, or `all` / `analytic` |
| `actions` | The actions the platform enforces for the subject |
| `conditionPaths` | The columns (and `role.key`) a stored condition may filter on |
| `scopePlaceholder` | `${workspace.id}`, `${project.id}`, or `null` |

| Subject | Model | Enforced actions | Condition paths |
|---|---|---|---|
| `all` | none | `manage` | none |
| `analytic` | none | `read` | none |
| `workspace` | `Workspace` | `read`, `update`, `delete`, `manage` | `id`, `createdBy`, `isPublic`, `deletedAt` |
| `workspaceMember` | `WorkspaceMember` | `update`, `delete` | `id`, `workspaceId`, `userId`, `roleId`, `role.key` |
| `workspaceInvite` | `WorkspaceInvite` | `create`, `manage` | `id`, `workspaceId`, `projectId`, `status`, `invitedByUserId`, `acceptedByUserId` |
| `workspaceJoinRequest` | `WorkspaceJoinRequest` | `update` | `id`, `workspaceId`, `userId`, `status`, `reviewedByUserId` |
| `project` | `Project` | `read`, `create`, `update`, `delete` | `id`, `workspaceId`, `createdBy`, `deletedAt` |
| `projectMember` | `ProjectMember` | `create`, `update`, `delete` | `id`, `projectId`, `userId`, `roleId`, `role.key` |
| `activityLog`, `apiKey`, `device`, `featureFlag`, `passwordHistory`, `role`, `session`, `termPolicy`, `user` | the model of the same name | every action | none |

**Placeholders.** A condition value that equals one of these tokens is replaced by the request context value before the ability is built: `${user.id}`, `${user.roleId}`, `${user.role.key}`, `${workspace.id}`, `${workspaceMember.id}`, `${workspaceMember.roleId}`, `${workspaceMember.role.key}`, `${project.id}`, `${projectMember.id}`, `${projectMember.roleId}`, `${projectMember.role.key}`, `${request.language}`. A placeholder with no value in the request context fails closed: an allowing rule that holds it is dropped, and an inverted rule that holds it stays as an unconditional deny.

**Scope conditions.** Each workspace-level and project-level subject ties its rules to the active boundary through a scope key set to a placeholder:

| Subject | Level | Condition key | Placeholder |
|---|---|---|---|
| `workspace` | workspace | `id` | `${workspace.id}` |
| `workspaceMember` | workspace | `workspaceId` | `${workspace.id}` |
| `workspaceInvite` | workspace | `workspaceId` | `${workspace.id}` |
| `workspaceJoinRequest` | workspace | `workspaceId` | `${workspace.id}` |
| `project` | project | `id` | `${project.id}` |
| `projectMember` | project | `projectId` | `${project.id}` |
| `analytic` | workspace | `workspaceId` | `${workspace.id}` |

`scopedCondition(subject, action, extra?)` in `src/modules/policy/utils/policy.scope.util.ts` builds that condition for the seed data: the subject's scope key resolved from its registry placeholder, followed by `extra`. A subject with no scope placeholder, and a lone `create` on `project` (no project exists yet), carry no scope pair.

### Important Notes

- `@PolicyProtected()` reads the policies the user and member guards stored, all of which depend on `@AuthJwtAccessProtected()`
- The stack reads top to bottom `@PolicyProtected()` → `@ProjectMemberProtected()` → `@WorkspaceMemberProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- `superAdmin` passes every `@PolicyProtected` route through its persisted `manage` on `all` policy. CASL treats `manage` as every action and `all` as every subject.
- The guard asks by subject type, so a rule's `conditions` narrow the rows a query may reach and are not evaluated by the guard. A domain that passes `{ subject, record }` to `can` gets the conditions evaluated against that record.
- Every action of a required policy has to be allowed by the ability. Requiring `[EnumPolicyAction.update, EnumPolicyAction.delete]` on the `EnumPolicySubject.user` subject grants access only when the ability allows both actions, not just one.

## Term Policy Acceptance Protected

`TermPolicyAcceptanceProtected` rejects the request until the user has accepted the required policies (Terms of Service, Privacy Policy, and the rest of the set).

Details: [Term Policy Documentation][ref-doc-term-policy].

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
  @Query({ schema: TermPolicyAcceptedListRequestSchema })
  query: TermPolicyAcceptedListRequestDto,
  @AuthJwtPayload('userId') userId: string
): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
  return this.termPolicyAcceptanceHttpService.getListUserAccepted(
    userId,
    query
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
3. **Term Policy Lookup**: Reads the user's acceptance flags (`termsOfServiceAccepted`, `privacyAccepted`, `marketingAccepted`, `cookiesAccepted`) from the stored user
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
    
    SetDefault --> GetTermPolicy[Read user acceptance<br/>flags]
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

Four decorators scope a `/user` request to one workspace and, inside it, to one project. They occupy slots 5-8 of the stack above and are documented in full by the modules that own them.

| Decorator | Guard it binds | Selects the resource from | Policy store |
|---|---|---|---|
| `@WorkspaceProtected()` | `WorkspaceGuard` | The `x-workspace-id` header | Unchanged |
| `@WorkspaceMemberProtected()` | `WorkspaceMemberGuard` | The membership of the resolved workspace | Overwritten with the workspace role's policies |
| `@ProjectProtected()` | `ProjectGuard` | The `:projectId` route param, constrained to the resolved workspace | Unchanged |
| `@ProjectMemberProtected({ required?: boolean })` | `ProjectMemberGuard` | The membership of the resolved project | The project role's policies appended |

Three properties matter wherever these appear:

- **Each guard reads what the previous one stored and never re-fetches or re-authenticates.** Dropping one from the stack leaves the next reading an empty store key, which surfaces as a `notFound` or `forbidden` rather than a crash.
- **`@ProjectMemberProtected()` is strict by default.** A caller with no `ProjectMember` row is rejected with `ProjectMemberForbiddenException`. With `{ required: false }` that caller passes with the workspace policies alone, so a workspace role that holds the capability (the `owner` holds explicit `project` and `projectMember` actions) still decides. Project leave uses the strict form.
- **The `/admin` scope takes none of them.** Admin routes reach the same resources through `@PolicyProtected()` and take the workspace or project id from the path.

For the guard bodies, the exceptions and status codes each one throws, the store keys, and the `@WorkspaceCurrent()` / `@ProjectCurrent()` parameter decorators, see [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

## Role Catalog and Policies

### Role Catalog

The seeded catalog is fixed. Roles are neither created nor deleted through the API.

| Scope | Keys |
|---|---|
| `platform` | `superAdmin`, `admin`, `user` |
| `workspace` | `owner`, `admin`, `member` |
| `project` | `admin`, `member`, `viewer` |

The keys live in `EnumRolePlatformKey`, `EnumRoleWorkspaceKey`, and `EnumRoleProjectKey`. Seeded rules per role, numbered by `priority` in the order listed. Workspace and project rules on a scoped subject carry the scope condition, except a lone `create` on `project`:

| Role | Policies |
|---|---|
| platform `superAdmin` | `manage` on `all` |
| platform `admin` | every action on `activityLog`, `apiKey`, `device`, `featureFlag`, `passwordHistory`, `role`, `session`, `termPolicy`, `user`; `read` on `analytic`, `workspace`, and `project` |
| platform `user` | none |
| workspace `owner` | `manage` on `workspace`; `update` and `delete` on `workspaceMember`; `manage` on `workspaceInvite`; `update` on `workspaceJoinRequest`; `create`, then `read`, `update`, and `delete` on `project`; `create`, `update`, and `delete` on `projectMember`; `read` on `analytic` |
| workspace `admin` | `read` and `update` on `workspace`; `update` and `delete` on `workspaceMember`; `manage` on `workspaceInvite`; `update` on `workspaceJoinRequest`; `create` and `delete` on `project`; `read` on `analytic` |
| workspace `member` | `read` on `workspace` |
| project `admin` | `read` and `update` on `project`; `create`, `update`, and `delete` on `projectMember` |
| project `member` | `read` on `project` |
| project `viewer` | `read` on `project` |

### Managing Roles and Policies

A role and its policies are two admin surfaces:

- `GET /admin/role/list` and `GET /admin/role/get/:roleId` read roles, and the list filters by `scope` (comma-delimited). The admin, system, and shared lists return `RoleListResponseDto`: `id`, `name`, `description` (nullable), `scope`, `key`, the timestamps, and a numeric `policies` count in place of the policy rows.
- `PUT /admin/role/update/:roleId` edits `name` and `description` only. The `key` and `scope` never change.
- `GET /admin/role/:roleId/policy/list`, `POST .../policy/create`, `PUT .../policy/update/:policyId`, and `DELETE .../policy/delete/:policyId` manage the policies of one role, and the list returns them in ascending `priority`. The API documentation is in Swagger under the configured `doc.prefix`.
- `GET /shared/role/list` returns the catalog a client picks a role from, offset paginated. The query takes a required `scope` (`workspace` or `project`), `page`, `perPage`, `search`, and `orderBy` (`createdAt`, `name`). Each row carries the policy count, so workspace and project members see how many policies a role holds.

**Example policy creation request** (`POST /admin/role/:roleId/policy/create`), one rule per call:

```json
{
  "subject": "project",
  "action": ["read", "update"],
  "priority": 3,
  "conditions": { "id": "${project.id}" }
}
```

`PUT .../policy/update/:policyId` takes the same body without `subject`, which is fixed at creation, and replaces the whole rule. The body is strict: an unknown field is rejected.

**Policy Structure:**

- **subject**: The resource type from `EnumPolicySubject`: all, apiKey, role, user, session, activityLog, passwordHistory, termPolicy, featureFlag, device, workspace, project, analytic, workspaceMember, workspaceInvite, workspaceJoinRequest, projectMember
- **action**: Array of actions from `EnumPolicyAction`: manage, read, create, update, delete
- **priority**: Required integer of 1 or more, unique within the role
- **conditions**: Optional Prisma where-input object
- **inverted**: Optional boolean, `false` when absent
- **reason**: Optional text of up to 500 characters

**Write rules.** A role holds one rule per `priority`: a create or update that reuses a `priority` of the same role is rejected with `PolicyExistException` (409, `51103`), including when two concurrent writes collide on the unique index. The `superAdmin` role rejects every policy write. A rule that breaks a storage rule is rejected with `PolicyRuleInvalidException` (422, `51105`), whose message is `policy.error.invalidRule.<reason>`:

| Reason | Raised when |
|---|---|
| `actionNotAllowed` | an action is not enforced for the subject in the registry |
| `roleScopeInvalid` | the subject is `all`, or a project role receives a subject that is not project-level |
| `scopeMissing` | a workspace or project role grants a scoped subject without the scope condition, unless the rule is inverted or is a lone `create` on `project` |
| `placeholderInvalid` | a condition holds a `${...}` token outside the allow list, a placeholder that is only part of a string value, or `__proto__`, `constructor`, or `prototype` at any depth |
| `conditionInvalid` | conditions are set on a subject with no condition paths, or a key is not an allowed column, or a filter operator or value shape is unsupported |

Supported scalar operators are `equals`, `not`, `in`, `notIn`, `lt`, `lte`, `gt`, `gte`, `contains`, `startsWith`, and `endsWith`. The logical keys are `AND`, `OR`, and `NOT`. `WorkspaceMember` and `ProjectMember` conditions may filter through the `role` relation on `key` with `is` and `isNot`.

### Assigning Roles

Request bodies name a role by UUID and the API checks the role's scope against the assignment:

| Assignment | Field | Required scope |
|---|---|---|
| Admin user creation | `roleId` | `platform` |
| Workspace member role change | `roleId` | `workspace`; `owner` is rejected (`WorkspaceOwnerRoleNotAssignableException`, 400, `51620`) |
| Workspace invite | `workspaceRoleId`, optional `projectRoleId` | `workspace` and `project` |
| Project member assign and role change | `roleId` | `project` |

A role of another scope is rejected with `RoleScopeMismatchException` (400, `50501`). Responses of other modules that embed a role return `role: { id, scope, key, name }` (`RoleRefResponseSchema`).

A user or member inherits every policy of the assigned role on the next request. No restart or extra configuration is involved.

```mermaid
flowchart LR
    User[User logs in] --> LoadRole[Role and policies loaded<br/>from database]
    LoadRole --> Guards[UserGuard and member guards<br/>fill the policy store]
    Guards --> PolicyGuard[PolicyGuard validates<br/>specific permissions]
    PolicyGuard --> Access[Access granted or denied<br/>based on policies]
```

### Important Notes

- **Role keys are immutable**: the `(scope, key)` pair identifies a catalog role, and the role admin API neither creates nor deletes roles
- **A workspace `owner` reaches every project of its workspace** through the explicit `project` and `projectMember` actions its workspace role holds, so no `ProjectMember` row is needed


<!-- REFERENCES -->

[casl]: https://casl.js.org/

[ref-doc-authentication]: authentication.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-device]: device.md
[ref-doc-workspace]: workspace.md
[ref-doc-project]: project.md
[ref-doc-feature-flag]: feature-flag.md
