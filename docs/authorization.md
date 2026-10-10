# Authorization Documentation

Decorator locations:

- **UserProtected**: `src/modules/user/decorators`
- **PlatformPolicyProtected**, **PolicyAbilityProtected**: `src/modules/policy/decorators`
- **WorkspacePolicyProtected**: `src/modules/workspace/decorators`
- **ProjectPolicyProtected**: `src/modules/project/decorators`
- **TermPolicyAcceptanceProtected**: `src/modules/term-policy/decorators`

The workspace and project decorators (`WorkspaceProtected`, `WorkspaceMemberProtected`, `ProjectProtected`, `ProjectMemberProtected` and the policy decorators above) are summarised here and documented in full by [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

## Overview

Authorization is CASL only. Guards stack as:

- user (authenticates and stores the user; loads no policies)
- workspace and project resolution and membership (store the resource and the member rows; load no policies)
- policy ability guard (builds the request ability from the role policies available in the request)
- policy enforcement guard (decides against the ability)
- term-policy acceptance

NestJS applies each layer on the route handler. A role decides nothing by itself: it is a named set of policies. `PolicyAbilityGuard` turns the policies of the roles in play into one CASL ability, and `PolicyGuard` evaluates the declared `(subject, action)` pairs against it. A route that carries no policy decorator loads no policies and builds no ability.

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
- [Roles and the Request Ability](#roles-and-the-request-ability)
- [Policy Protected](#policy-protected)
  - [Decorators](#decorators-2)
    - [PlatformPolicyProtected() Decorator](#platformpolicyprotected-decorator)
    - [Scoped Policy Decorators](#scoped-policy-decorators)
  - [Guards](#guards-2)
    - [PolicyAbilityGuard](#policyabilityguard)
    - [PolicyGuard](#policyguard)
  - [Record-Level Checks](#record-level-checks)
  - [Collection Queries](#collection-queries)
  - [Effective Permissions](#effective-permissions)
  - [CASL Integration](#casl-integration)
  - [Current Boundaries](#current-boundaries)
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
@PlatformPolicyProtected({ ... })          // 4.  One policy decorator: ability guard + enforcement guard
@ProjectMemberProtected(...)               // 5.  Project membership
@ProjectProtected()                        // 6.  Project resolution from :projectId
@WorkspaceMemberProtected()                // 7.  Workspace membership
@WorkspaceProtected()                      // 8.  Workspace resolution from x-workspace-id
@UserProtected()                           // 9.  User status
@FeatureFlagProtected('exampleKey')        // 10. Feature flag
@AuthJwtAccessProtected()                  // 11. JWT access or refresh
@ApiKeyProtected()                         // 12. API key
@HttpCode(HttpStatus.OK)                   // 13. HTTP status, only when it differs from the default
@Get('/endpoint')                          // 14. HTTP method, always last
```

A route takes only the slots it needs; the relative order of the ones it takes never changes. Guard execution therefore runs `@ApiKeyProtected()` → `@AuthJwtAccessProtected()` → `@FeatureFlagProtected()` → `@UserProtected()` → `@WorkspaceProtected()` → `@WorkspaceMemberProtected()` → `@ProjectProtected()` → `@ProjectMemberProtected()` → the policy decorator (ability guard, then enforcement guard) → `@TermPolicyAcceptanceProtected()`.

- A social-login guard (`@AuthSocialGoogleProtected()`) takes the JWT slot for that route.
- `@RequestThrottle({ ... })` sits outside this order. It mounts an interceptor, so it runs after every guard whatever its position in the stack. Routes declare it below `@ApiKeyProtected()`, so the rate limit reads next to the guards protecting the same route. See [Security and Middleware][ref-doc-security-and-middleware].
- Activity logging takes no slot. Domains build events with `ActivityLogDomain.prepare` and queue them with `ActivityLogDomain.stagePrepared`, and the global `ActivityLogInterceptor` writes them after the handler settles. See [Activity Log][ref-doc-activity-log].
- A guard that depends on state an earlier guard sets sits ABOVE that guard in source, so it runs after it.
- `@FeatureFlagProtected()` sits ABOVE `@AuthJwtAccessProtected()` so the flag guard sees `request.user`. Below it the guard always takes its anonymous branch, which makes `targetUserIds` and any rollout below 100% inert on that route.
- Slot 4 takes one of `@PlatformPolicyProtected`, `@WorkspacePolicyProtected`, `@ProjectPolicyProtected`, or `@PolicyAbilityProtected()`. The first three apply `PolicyAbilityGuard` and `PolicyGuard`; the last applies `PolicyAbilityGuard` alone.
- The workspace and project slots are used by the `/user` scope. The `/admin` scope reaches the same resources through `@PlatformPolicyProtected()`, which evaluates the caller's platform role policies, and takes the workspace or project id from the path.

## User Protected

`UserProtected` applies `UserGuard`, which reads the JWT `userId`, loads the user with its platform role, and stores the user under `UserStoreKey`. It authenticates only: it loads no policies and builds no ability. Email verification defaults to on.

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
8. **Role Scope**: Confirms the user's role has `platform` scope
9. **Store**: Stores the user under `UserStoreKey`

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
    CheckVerified -->|No| SetUser[Store user under UserStoreKey]
    
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
- This decorator stores the validated user via `RequestStoreService.set(UserStoreKey, user)` (read back with `RequestStoreService.get(UserStoreKey)`, e.g. by `@UserCurrent()`). The stored user carries its platform `role` row without policies

## Roles and the Request Ability

One `Role` model covers every level. A role has a `scope` (`platform`, `workspace`, or `project`), an immutable `key`, and a `name` and `description` an admin edits. The pair `(scope, key)` is unique. The role a user, a workspace member, or a project member holds is a foreign key (`roleId`) to that model, and each role owns the policies that define what it may do.

No decorator gates a route by role. The role reaches a route through the request ability: `PolicyAbilityGuard` builds one ability per request from every role available in the request context and stores it under `PolicyAbilityStoreKey`.

| Role | Included when |
|---|---|
| The platform role of the authenticated user | Always |
| The workspace role of the acting workspace member | A workspace member is stored |
| The project role of the acting project member | A project member is stored |

The guard reads the stored user (required), the workspace and workspace member, and the project and project member, and loads the policy rows of every role id found through `PolicyDomain.findManyByRoleIds`. The rows come from `PolicyCache`, a read-through cache keyed `Policy:Role:{roleId}` with a five-minute TTL; a policy write evicts the key of its role. The guard builds one placeholder map from the same context (`${userId}` always, `${workspaceId}` and `${projectId}` when a workspace or project is stored) and passes the rows and the map to `PolicyAbilityFactory.build`. The factory adds every allowing rule before every inverted rule, so a matching inverted rule is authoritative whichever role holds it. An absent rule does not revoke a broader allow; a narrowing role uses an explicit inverted rule.

The ability lives in the request-scoped store, so it never crosses requests. A guard that finds a stored ability returns without loading or overwriting anything, so stacked policy decorators share the first ability built for the request.

```mermaid
flowchart TD
    User[UserGuard<br/>user stored, no policies] --> Route{Route scope}
    Route -->|/admin| PA[PolicyAbilityGuard<br/>platform role rules]
    Route -->|/user workspace| WM[WorkspaceMemberGuard<br/>member stored, no policies]
    WM --> WA[PolicyAbilityGuard<br/>platform + workspace rules]
    WM --> PM{Project route?}
    PM -->|Yes| PMG[ProjectMemberGuard<br/>member stored when one exists]
    PMG --> PJA[PolicyAbilityGuard<br/>platform + workspace + project rules]
    PA --> Enforce[PolicyGuard]
    WA --> Enforce
    PJA --> Enforce
```

Reading the current role: `@UserCurrent()` returns the stored `IUser`, whose `role` is the `Role` row (`id`, `scope`, `key`, `name`, `description`, and audit columns) without its policies. `@WorkspaceMemberCurrent()` returns the workspace member with its role (`id`, `scope`, `key`, `name`, no policies). `@ProjectMemberCurrent()` returns the project member with its role (`id`, `scope`, `key`, `name`, no policies).

A domain or HTTP service that has to branch on a capability reads the ability through `PolicyAbilityDomain.requireStored` and calls `ability.can(action, subject)`, which answers `true` or `false`. `PolicyAbilityDomain.assertCan(action, target)` reads the stored ability itself and throws `PolicyForbiddenException` (403, `51100`) instead, carrying the `reason` of the matched inverted rule when one exists and `missing`, the denied subject and action. `PolicyGuard` calls `assertCanEvery` with every `@PolicyRequired` pair, so one 403 lists all missing permissions grouped by subject in `metadata.missing`, for example `[{ "subject": "Project", "actions": ["read", "update"] }]`. `target` is a subject name for a type-level check, or a record tagged with `subject(EnumPolicySubject.X, record)` from `@casl/ability` for a record check.

`superAdmin` holds a persisted policy `manage` on `all`. That row is what lets it pass every enforcement guard, and the policies of the `superAdmin` role cannot be created, updated, or deleted (`PolicyImmutableException`, 403, `51104`). The platform `admin` role holds an explicit subject list, not `all`.

## Policy Protected

A policy decorator is CASL. A policy names an action (`read`, `create`, `update`, `delete`, `manage`) on a subject (`User`, `Role`, `Session`, and the rest of `EnumPolicySubject`).

### Decorators

#### PlatformPolicyProtected Decorator

**Method decorator** that applies `PolicyAbilityGuard` and `PolicyGuard` to route handlers, stores the required `{ subject, action[] }` metadata under `PolicyRequiredMetaKey`, and documents the `403` and `500` policy error responses. It accepts the `EnumPolicyPlatformSubject` subset of `EnumPolicySubject`.

**Parameters:**
- `...requiredPolicies` (IPolicyRequired[]): One or more `{ subject, action[] }` objects naming the required permissions

**Available Policy Actions:**
- `EnumPolicyAction.manage` - Full control over a subject
- `EnumPolicyAction.read` - Read/view permission
- `EnumPolicyAction.create` - Create new resources
- `EnumPolicyAction.update` - Modify existing resources
- `EnumPolicyAction.delete` - Remove resources

**Policy Subjects** (`EnumPolicySubject`):
- `EnumPolicySubject.all` - All resources
- `EnumPolicySubject.ApiKey` - API key management
- `EnumPolicySubject.Role` - Role management
- `EnumPolicySubject.User` - User management
- `EnumPolicySubject.Session` - Session management
- `EnumPolicySubject.ActivityLog` - Activity logs
- `EnumPolicySubject.PasswordHistory` - Password history
- `EnumPolicySubject.TermPolicy` - Terms and policies
- `EnumPolicySubject.FeatureFlag` - Feature flags
- `EnumPolicySubject.Device` - Device management
- `EnumPolicySubject.Workspace` - Workspace management
- `EnumPolicySubject.Project` - Project management
- `EnumPolicySubject.Analytic` - Admin analytics dashboard, anomaly, and fraud read routes
- `EnumPolicySubject.WorkspaceMember` - Workspace member list (workspace and admin), role change, and removal
- `EnumPolicySubject.WorkspaceInvite` - Workspace invite create, resend, and revoke
- `EnumPolicySubject.WorkspaceJoinRequest` - Workspace join request accept and reject
- `EnumPolicySubject.ProjectMember` - Project member assign, role change, and removal

**Usage:**

```typescript
@PlatformPolicyProtected({
  subject: EnumPolicySubject.User,
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

@PlatformPolicyProtected({
  subject: EnumPolicySubject.User,
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

@PlatformPolicyProtected(
  {
    subject: EnumPolicySubject.User,
    action: [EnumPolicyAction.read]
  },
  {
    subject: EnumPolicySubject.Session,
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

#### Scoped Policy Decorators

`PlatformPolicyProtected`, `WorkspacePolicyProtected`, and `ProjectPolicyProtected` are thin wrappers over `PolicyProtected`. They apply the same `PolicyAbilityGuard` and `PolicyGuard` and store the same metadata key; they differ only in the subject union the call site accepts, which is a compile-time constraint and not a separate ability.

| Decorator | Subjects it accepts | Used by |
|---|---|---|
| `@PlatformPolicyProtected({ subject, action[] })` | `EnumPolicyPlatformSubject`: `all`, `ApiKey`, `Role`, `User`, `Session`, `ActivityLog`, `PasswordHistory`, `TermPolicy`, `FeatureFlag`, `Device`, `Workspace`, `WorkspaceMember`, `Project`, `Analytic` | `/admin` routes |
| `@WorkspacePolicyProtected({ subject, action[] })` | `EnumPolicyWorkspaceSubject`: `Workspace`, `WorkspaceMember`, `WorkspaceInvite`, `WorkspaceJoinRequest`, `Project`, `WorkspaceAnalytic` | `/user` workspace routes, project create, workspace analytics |
| `@ProjectPolicyProtected({ subject, action[] })` | `EnumPolicyProjectSubject`: `Project`, `ProjectMember` | `/user` project routes |
| `@PolicyAbilityProtected()` | none | Builds the ability for routes that read it without enforcing a policy (permissions, member project list) |

`WorkspaceMemberProtected` and `ProjectMemberProtected` stay membership decorators. Their parameters are documented in [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

### Guards

#### `PolicyAbilityGuard`

The guard reads the stored `PolicyAbilityStoreKey` first and returns when it holds an ability. Otherwise it reads the user (required), the workspace and workspace member, and the project and project member from the request store, and builds the ability from the role policies of the roles it finds. A missing stored user throws `RequestContextMissingException` (500, `50304`). The guard resolves no route id, loads no target record, and authorizes nothing.

#### `PolicyGuard`

The guard reads the handler's required policies, then calls `PolicyAbilityDomain.assertCanEvery` with every required `(subject, action)` pair as a type-level check. It passes subject names, never records. It loads no policy rows and builds no ability.

The policy decorators follow this validation sequence:

1. **Required Policies Check**: Validates that required policies are declared on the handler; none declared throws `PolicyPredefinedNotFoundException` (500, `51101`)
2. **Ability Check**: Reads the ability under `PolicyAbilityStoreKey`; a missing entry throws `RequestContextMissingException` (500, `50304`)
3. **Permission Validation**: `PolicyAbilityDomain.assertCanEvery` checks every required `(subject, action)` pair against the ability
4. **Access Decision**: Grants access, or throws one `PolicyForbiddenException` whose `metadata.missing` groups every denied action by subject and whose optional `metadata.reason` comes from the first matching inverted rule

**Flow Diagram:**

```mermaid
flowchart TD
    Start([Request Received]) --> JwtGuard[ @AuthJwtAccessProtected<br/>Extract JWT token]
    JwtGuard --> UserGuard[ @UserProtected<br/>Validate user]
    UserGuard --> AbilityGuard[ PolicyAbilityGuard<br/>build the ability or reuse the stored one]
    AbilityGuard --> CheckRequired{Required policies<br/>declared?}

    CheckRequired -->|No| ErrorPredefined[Throw PolicyPredefinedNotFoundException<br/>500 Internal Server Error]
    CheckRequired -->|Yes| CheckAbility{Ability stored under<br/>PolicyAbilityStoreKey?}

    CheckAbility -->|No| ErrorCtx[Throw RequestContextMissingException<br/>500 Internal Server Error]
    CheckAbility -->|Yes| ValidateAbilities{Ability allows every<br/>required action?}

    ValidateAbilities -->|No| ErrorForbidden[Throw PolicyForbiddenException<br/>403 Forbidden]
    ValidateAbilities -->|Yes| GrantAccess[Grant access]

    GrantAccess --> Success([Access Granted])

    ErrorPredefined --> End([Request Rejected])
    ErrorCtx --> End
    ErrorForbidden --> End
```

### Record-Level Checks

The type-level check asks by subject name, so a rule's `conditions` are not evaluated by it. An HTTP service closes that gap by loading the record and calling `assertCan(action, subject(EnumPolicySubject.X, record))`. CASL evaluates the conditions against the real record before the domain call. A target lookup stays within its workspace, project, user, or role boundary, so an out-of-bound identifier answers the module's not-found exception.

| Surface | Actions | Record checked |
|---|---|---|
| Workspace update, visibility, slug, delete, ownership transfer | `update`, `delete` | Resolved `Workspace` |
| Workspace member role update and remove | `update`, `delete` | Target `WorkspaceMember` |
| Invite create, resend, revoke | `create`, `update`, `delete` | Prospective or loaded `WorkspaceInvite` |
| Join-request accept and reject | `update` | Loaded `WorkspaceJoinRequest` |
| Project create, read, update, slug, delete | `create`, `read`, `update`, `delete` | Prospective or resolved `Project` |
| Project member assign, role update, remove | `create`, `update`, `delete` | Prospective or loaded `ProjectMember` |
| Admin user get, status, password, two-factor reset | `read`, `update` | Loaded `User` |
| Admin API key writes | `update`, `delete` | Loaded `ApiKey` |
| Admin role get, update, delete and policy writes | `read`, `update`, `delete` | Loaded `Role` |
| Admin workspace and feature-flag operations | `read`, `update` | Loaded `Workspace` or `FeatureFlag` |
| Admin term-policy and content operations | `read`, `update`, `delete` | Loaded `TermPolicy` |
| Admin session and device removal | `update`, `delete` | Loaded `User`, `Session`, or device ownership record |

The service authorizes its loaded copy. The domain reloads the data it needs and applies business invariants such as last-owner, last-admin, role-scope, and immutable-role checks. Domains therefore remain callable from processors and other non-HTTP flows without request ability state.

### Collection Queries

`PolicyAbilityDomain.accessibleWhere(action, subject)` converts the stored ability into a Prisma where-input with `accessibleBy(ability, action).ofType(subject)`. The subject is typed as a generic `K extends PolicyModelSubject`, and the return type is that model's `WhereInput` (for example `Prisma.RoleWhereInput` for `Role`), so a call site passes no type argument and needs no cast. It throws `PolicyForbiddenException` when the ability holds no rule for that action and subject, and a missing stored ability throws `RequestContextMissingException`.

| Collection | Policy predicate |
|---|---|
| Admin user, session, API key, role, password-history, term-policy, feature-flag, workspace, workspace-member, and project lists | `accessibleWhere(read, <subject>)` |
| Admin device list | `accessibleWhere(read, Device)`, nested as `{ device: <where> }` on the `DeviceOwnership` query |
| Admin activity-log lists | `accessibleWhere(read, ActivityLog)` |
| Admin policy list | `accessibleWhere(read, Role)` through the policy's `role` relation |
| Admin user export | `accessibleWhere(read, User)` |
| Workspace member, invite, and join-request lists | The matching workspace subject with `read` |
| Project member list | `accessibleWhere(read, ProjectMember)` |
| Member project list | `accessibleWhere(read, Project)` |

The HTTP service passes the predicate to the domain as an optional `where`. The repository AND-composes it with mandatory workspace, project, active-row, search, equality, and pagination constraints. The member project predicate alone decides which projects the caller sees; the seeded workspace `member` rule limits it to projects where that user is assigned. Analytics lists, shared self-service lists, and public and system routes carry no collection predicate.

### Effective Permissions

`PolicyAbilityDomain.getEffectivePermissions(targets)` evaluates every concrete `EnumPolicyAction` against each tagged scope record and returns only subjects with at least one granted action:

```typescript
{
  subject: EnumPolicySubject;
  actions: EnumPolicyAction[];
}
```

`GET /user/workspace/permissions` evaluates the loaded `Workspace` record plus representative `WorkspaceMember`, `WorkspaceInvite`, `WorkspaceJoinRequest`, `Project`, and `WorkspaceAnalytic` records carrying its `workspaceId`. A conditional rule is reported only when that representative record satisfies the rule. For example, the seeded assigned-project rule depends on a project membership relation, so it is not inferred from the workspace-level `Project` target alone.

`GET /user/project/:projectId/permissions` evaluates the loaded `Project` record and a representative `ProjectMember` record carrying its `projectId`. Both routes use `@PolicyAbilityProtected()` and the single stored request ability. The project route permits a missing project membership, so platform and workspace policies can still grant permissions on that project. A caller with no matching grant receives `200` with an empty permission list.

### CASL Integration

The project uses [CASL][casl] with `@casl/prisma`. The ability is a typed Prisma ability created by `createPrismaAbility`, so a stored condition is a Prisma where-input. `PolicyAbility` is typed with `PrismaQueryFactory<Prisma.TypeMap>`, which ties each model subject to its Prisma row type.

**Subject types.** `PolicyModelSubject` is the members of `EnumPolicySubject` named after a Prisma model; `PolicyNonModelSubject` is the rest (`all`, `Analytic`, `WorkspaceAnalytic`). A record passed to an ability check is `ForcedSubject<K> & Partial<model>` for a model subject `K`, so its fields are type-checked against the model row. A non-model subject is checked by name only.

**Rule model.** A `Policy` row is one rule:

| Field | Meaning |
|---|---|
| `subject` | A value of `EnumPolicySubject`. It maps onto the Prisma model of the same name; `all`, `Analytic`, and `WorkspaceAnalytic` have no model |
| `action` | One or more of `manage`, `read`, `create`, `update`, `delete` |
| `conditions` | A Prisma where-input as JSON, or `null` for the whole subject |
| `inverted` | `true` makes the rule a CASL `cannot` |
| `reason` | Optional text (max 500) carried by an inverted rule |

A role holds any number of rules for one subject. A policy write stores the rule as given; no registry checks a rule's actions, conditions, or scope against the role.

**PolicyAbilityFactory:**

- `build(policies, placeholders)`: Resolves the placeholders of each stored rule and creates the Prisma ability, allowing rules first and inverted rules after. An inverted rule becomes a `cannot` carrying its reason

**PolicyAbilityDomain:**

- `requireStored(key)`: Reads a request-store value, throwing `RequestContextMissingException` when it is empty
- `assertCan(action, target)`: Throws `PolicyForbiddenException` when the stored ability denies the action on the subject name or tagged record
- `accessibleWhere(action, subject)`: The Prisma where-input of the records the stored ability reaches for that subject, throwing `PolicyForbiddenException` when the ability holds no rule for it, so a query never runs without its predicate and never with an unrestricted one
- `getEffectivePermissions(targets)`: The concrete actions the stored ability grants on tagged scope records, omitting a subject with none

**PolicyDomain:**

- `findManyByRole(roleId)`: Lists the policy rows of one role
- `findManyByRoleIds(...roleIds)`: Returns the policy rows of every role, read through `PolicyCache`
- `createByAdmin`, `updateByAdmin`, and `deleteByAdmin`: Write a role's policy rows, evict the role's cache key, and reject any write to the `superAdmin` role

**Query predicates.** Policy-gated lists use the ability-derived Prisma predicates described in [Collection Queries](#collection-queries). The Prisma client carries `createCaslExtension()`, which turns a denied predicate into "matches nothing".

**Placeholders.** A condition value that equals one of these tokens is replaced by a value from the request context before the ability is built, at any depth of the condition: `${userId}`, `${workspaceId}`, `${projectId}`. An allowing rule whose placeholder has no value in the request, or whose conditions are not a JSON object, is dropped, so a missing context never widens a rule into an unconditional one. An inverted rule in that state becomes an unconditional deny on its subject and actions.

**Scope conditions.** Seeded workspace-level and project-level rules tie themselves to the active boundary through a condition key set to a placeholder:

| Subject | Level | Condition key | Placeholder |
|---|---|---|---|
| `Workspace` | workspace | `id` | `${workspaceId}` |
| `WorkspaceMember`, `WorkspaceInvite`, `WorkspaceJoinRequest`, `Project`, `WorkspaceAnalytic` | workspace | `workspaceId` | `${workspaceId}` |
| `Project` | project | `id` | `${projectId}` |
| `ProjectMember` | workspace and project | `projectId` | `${projectId}` |

A lone `create` on `Project` carries no condition, since no project exists yet.

### Current Boundaries

- Platform, workspace, and project policies form one stored request ability built by one ability guard.
- `PolicyGuard` performs type-level checks. HTTP services perform record-level checks and derive collection predicates.
- Record authorization and the following domain write are separate operations. The domain reloads the record and validates its current business state before writing.
- `${userId}`, `${workspaceId}`, and `${projectId}` are the complete placeholder catalog.
- Policy writes store their subject, actions, conditions, inversion, and reason as supplied after request-schema validation. No separate policy registry validates role-scope or condition-key compatibility.
- Domains accept optional policy predicates from HTTP callers, while processors and other internal callers omit them.

### Important Notes

- A policy decorator reads what the user, workspace, and project guards stored, all of which depend on `@AuthJwtAccessProtected()`
- The stack reads top to bottom policy decorator → `@ProjectMemberProtected()` → `@ProjectProtected()` → `@WorkspaceMemberProtected()` → `@WorkspaceProtected()` → `@UserProtected()` → `@AuthJwtAccessProtected()`. See [Authentication Documentation][ref-doc-authentication] for `@AuthJwtAccessProtected()` details
- `superAdmin` passes every `@PlatformPolicyProtected` route through its persisted `manage` on `all` policy. CASL treats `manage` as every action and `all` as every subject.
- A type-level check asks by subject type, so a rule's `conditions` narrow the rows a query may reach and are not evaluated by it. An HTTP service that passes a tagged record gets the conditions evaluated against that record.
- Every action of a required policy has to be allowed by the ability. Requiring `[EnumPolicyAction.update, EnumPolicyAction.delete]` on the `EnumPolicySubject.User` subject grants access only when the ability allows both actions, not just one.

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

| Decorator | Guard it binds | Selects the resource from | Stores |
|---|---|---|---|
| `@WorkspaceProtected()` | `WorkspaceGuard` | The `x-workspace-id` header | The workspace row |
| `@WorkspaceMemberProtected()` | `WorkspaceMemberGuard` | The membership of the resolved workspace | The workspace member row with its role |
| `@ProjectProtected()` | `ProjectGuard` | The `:projectId` route param, constrained to the resolved workspace | The project row |
| `@ProjectMemberProtected({ required?: boolean })` | `ProjectMemberGuard` | The membership of the resolved project | The project member row with its role, when one exists |

Three properties matter wherever these appear:

- **Each guard reads what the previous one stored and never re-fetches or re-authenticates.** Dropping one from the stack leaves the next reading an empty store key, which surfaces as a `notFound`, a `forbidden`, or a `RequestContextMissingException`.
- **`@ProjectMemberProtected()` is strict by default.** A caller with no `ProjectMember` row is rejected with `ProjectMemberForbiddenException`. With `{ required: false }` that caller passes and no member is stored, so the project ability carries the platform and workspace rules alone and a workspace role that holds the capability (the `owner` and `admin` hold explicit `Project` and `ProjectMember` actions) still decides. Every policy-gated project route uses that form, and project leave uses the strict form.
- **The `/admin` scope takes none of them.** Admin routes reach the same resources through `@PlatformPolicyProtected()` and take the workspace or project id from the path.

For the guard bodies, the exceptions and status codes each one throws, the store keys, and the `@WorkspaceCurrent()` / `@ProjectCurrent()` parameter decorators, see [Workspace][ref-doc-workspace] and [Project][ref-doc-project].

## Role Catalog and Policies

### Role Catalog

The seeded catalog is fixed. Roles are neither created nor deleted through the API.

| Scope | Keys |
|---|---|
| `platform` | `superAdmin`, `admin`, `user` |
| `workspace` | `owner`, `admin`, `member` |
| `project` | `admin`, `member`, `viewer` |

The keys live in `EnumRolePlatformKey`, `EnumRoleWorkspaceKey`, and `EnumRoleProjectKey`. Seeded rules per role, in the order listed. Workspace and project rules on a scoped subject carry the scope condition, except a lone `create` on `Project`:

| Role | Policies |
|---|---|
| platform `superAdmin` | `manage` on `all` |
| platform `admin` | every action on `ActivityLog`, `ApiKey`, `Device`, `FeatureFlag`, `PasswordHistory`, `Role`, `Session`, `TermPolicy`, `User`; `read` on `Analytic`, `Workspace`, `WorkspaceMember`, and `Project` |
| platform `user` | none |
| workspace `owner` | `manage` on `Workspace`; `read`, `update`, and `delete` on `WorkspaceMember`; `manage` on `WorkspaceInvite`; `read` and `update` on `WorkspaceJoinRequest`; `create`, then `read`, `update`, and `delete` on `Project`; `create`, `read`, `update`, and `delete` on `ProjectMember`; `read` on `WorkspaceAnalytic` |
| workspace `admin` | `read` and `update` on `Workspace`; `read`, `update`, and `delete` on `WorkspaceMember`; `manage` on `WorkspaceInvite`; `read` and `update` on `WorkspaceJoinRequest`; `create`, then `read`, `update`, and `delete` on `Project`; `create`, `read`, `update`, and `delete` on `ProjectMember`; `read` on `WorkspaceAnalytic` |
| workspace `member` | `read` on `Workspace`; `read` on `WorkspaceMember` |
| project `admin` | `read`, `update`, and `delete` on `Project`; `create`, `read`, `update`, and `delete` on `ProjectMember` |
| project `member` | `read` on `Project`; `read` on `ProjectMember` |
| project `viewer` | `read` on `Project`; `read` on `ProjectMember` |

### Managing Roles and Policies

A role and its policies are two admin surfaces:

- `GET /admin/role/list` and `GET /admin/role/get/:roleId` read roles, and the list filters by `scope` (comma-delimited). The admin, system, and shared lists return `RoleListResponseDto`: `id`, `name`, `description` (nullable), `scope`, `key`, the timestamps, and a numeric `policies` count in place of the policy rows.
- `PUT /admin/role/update/:roleId` edits `name` and `description` only. The `key` and `scope` never change.
- `POST /admin/role/create` creates a role and requires `Role` `read` and `create`. The body carries `scope` (`platform`, `workspace`, or `project`), `key`, `name`, and an optional `description` (up to 500 characters). `key` is trimmed, lowercased, 3 to 50 characters of `a-z`, `0-9`, and `.` in any position (for example `workspace.editor`). `name` is the display label, trimmed, 3 to 50 characters, the same rule the update body uses. A role that already holds that `(scope, key)` pair answers `RoleExistException` (409, `50502`). The new role holds no policies, and the response is the role (`RoleSchema`). Each create stages the `adminRoleCreate` activity log.
- `DELETE /admin/role/delete/:roleId` hard-deletes a role and requires `Role` `read` and `delete`. The role's policies go with it. Each delete stages the `adminRoleDelete` activity log.
- `GET /admin/role/:roleId/policy/list`, `POST .../policy/create`, `PUT .../policy/update/:policyId`, and `DELETE .../policy/delete/:policyId` manage the policies of one role. The API documentation is in Swagger under the configured `doc.prefix`.
- `GET /shared/role/list` returns the catalog a client picks a role from, offset paginated. The query takes a required `scope` (`workspace` or `project`), `page`, `perPage`, `search`, and `orderBy` (`createdAt`, `name`). Each row carries the policy count, so workspace and project members see how many policies a role holds.

**Delete rules.** A catalog role, one whose `key` is listed for its scope in `EnumRolePlatformKey`, `EnumRoleWorkspaceKey`, or `EnumRoleProjectKey`, is never deleted. A role still referenced by a user, a workspace member, a project member, or a workspace invite (as its workspace role or its project role) is not deleted either.

```mermaid
flowchart TD
    Req[DELETE /admin/role/delete/:roleId] --> Find{Role exists?}
    Find -->|No| NF[RoleNotFoundException<br/>404, 50500]
    Find -->|Yes| Pre{Catalog key<br/>of its scope?}
    Pre -->|Yes| PD[RolePredefinedException<br/>403, 50504]
    Pre -->|No| Used{Referenced by a user,<br/>member, or invite?}
    Used -->|Yes| U[RoleUsedException<br/>409, 50503]
    Used -->|No| Del[Delete role and its policies]
    Del --> Log[Stage adminRoleDelete]
```

**Example policy creation request** (`POST /admin/role/:roleId/policy/create`), one rule per call:

```json
{
  "subject": "Project",
  "action": ["read", "update"],
  "conditions": { "projectId": "${projectId}" }
}
```

`PUT .../policy/update/:policyId` takes the same body without `subject`, which is fixed at creation, and replaces the whole rule. The body is strict: an unknown field is rejected.

**Policy Structure:**

- **subject**: The resource type from `EnumPolicySubject`: all, ApiKey, Role, User, Session, ActivityLog, PasswordHistory, TermPolicy, FeatureFlag, Device, Workspace, Project, Analytic, WorkspaceAnalytic, WorkspaceMember, WorkspaceInvite, WorkspaceJoinRequest, ProjectMember
- **action**: Array of actions from `EnumPolicyAction`: manage, read, create, update, delete
- **conditions**: Optional Prisma where-input object
- **inverted**: Optional boolean, `false` when absent
- **reason**: Optional text of up to 500 characters

**Write rules.** The `superAdmin` role rejects every policy write (`PolicyImmutableException`, 403, `51104`). A write to a role that does not exist answers `RoleNotFoundException`, and an update or delete of a policy the role does not hold answers `PolicyNotFoundException`. The request body is validated as a strict zod schema: an unknown field and a `conditions` value that is not a JSON object are rejected. The rule is stored as given; no check compares its subject, actions, or conditions with the role's scope.

Conditions use the Prisma where-input dialect of the subject's model. A condition on a relation names an operator (`is`, `isNot`, `some`, `none`, `every`), and the logical keys are `AND`, `OR`, and `NOT`.

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
    LoadRole --> Guards[Ability guard<br/>loads the policies of the roles in play]
    Guards --> PolicyGuard[Enforcement guard validates<br/>specific permissions]
    PolicyGuard --> Access[Access granted or denied<br/>based on policies]
```

### Important Notes

- **Role keys are immutable**: the `(scope, key)` pair identifies a role. The key is supplied at creation, independent of `name`, and an update changes `name` and `description` only
- **A workspace `owner` or `admin` reaches every project of its workspace** through the explicit `Project` and `ProjectMember` actions its workspace role holds, so no `ProjectMember` row is needed


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
