---
paths:
    - '**/guards/**'
    - '**/middlewares/**'
    - '**/decorators/**'
    - 'src/modules/**/controllers/**'
---

# Guards and decorators

Exception classes, status codes, and the filter chain: `exceptions.md`, `exception-class.md`, `filter.md`.

## Decorator order

Nest runs guards bottom-up: the decorator nearest the method executes first, so a guard that reads state another guard sets sits above it. A misordered stack boots and answers the reading guard's `*GuardMissingException` on every request (Guards).

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation + global error kit
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@Header(name, value)                   // 3.  Static response header, when set
@TermPolicyAcceptanceProtected(...)    // 4.  Term policy
@PolicyProtected({...})                // 5.  CASL policy, admin routes
@RoleProtected(...)                    // 6.  Role, admin routes
@ProjectMemberProtected()              // 7.  Project membership
@ProjectProtected()                    // 8.  Project exists
@WorkspaceMemberProtected(...)         // 9.  Workspace membership; pass roles to also gate by role
@WorkspaceProtected()                  // 10. Workspace exists
@UserProtected()                       // 11. User status
@FeatureFlagProtected(...)             // 12. Feature flag; reads RequestActorStoreKey, so above JWT
@RequestThrottle({ user: true })       // 13. Per-user throttle guard; runs after JWT
@AuthJwtAccessProtected()              // 14. JWT; a social login guard sits above 12, so the flag runs first
@ApiKeyProtected()                     // 15. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout('1m') // 16. Upload routes: multipart interceptor, then timeout
@HttpCode(HttpStatus.OK)               // 17. @Post only
@Get('/endpoint')                      // 18. HTTP method, always last
```

- `@RequestThrottle` (`src/common/request/decorators/request.decorator.ts`) mounts the per-user throttle guard directly above `@AuthJwtAccessProtected()`, so it runs after the JWT guard and before every guard that reads the database; a route with no JWT guard keeps the slot, directly above `@ApiKeyProtected()`. It takes `{ user: true, route? }` when JWT-protected and `{ route }` only on `public` and `system` (`EnumRequestThrottleRoute`).
- A `@Post` whose action creates the row its path names (`/create`, `/sign-up`, `/mobile-number/add`) keeps the default 201; every other `@Post` carries `@HttpCode(HttpStatus.OK)`.
- `@WorkspaceMemberProtected(...roles)` adds `WorkspaceRoleGuard` with roles (`src/modules/workspace/decorators/workspace.decorator.ts`). `@ProjectMemberProtected(...roles)` uses `ProjectMemberGuard` with no roles and `ProjectRoleGuard` alone with roles (`src/modules/project/decorators/project.decorator.ts`). Both merge the caller's member as `projectMember` into `ProjectContextStoreKey`; `ProjectRoleGuard` merges `null` when a workspace owner or admin passes with no member row.
- Admin scope carries no `Workspace*` or `Project*` guard (they resolve `x-workspace-id` from CLS; an admin reads across workspaces): it scopes through `@RoleProtected` plus `@PolicyProtected` and a validated `:workspaceId` / `:projectId` param. `@RoleProtected` never lists `superAdmin`; `RoleService.validateRoleGuard` and `PolicyService.validatePolicyGuard` pass it.
- Every workspace-scoped and project-scoped route in `user`, `shared`, and `public` carries `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)`; the decorator takes an `EnumFeatureFlagKey` member, and a metadata sub-key, an `EnumFeatureFlagMetadataKey` member, is asserted in the service (`service.md`, Shape).

## Guards

- A guard reads transport inputs and delegates to a service.
- A guard checks the context a guard below it wrote before calling the service (`WorkspaceMemberGuard.canActivate`, `src/modules/workspace/guards/workspace.member.guard.ts`), so a service `validate*Guard` takes a guard-provided subject non-null. A missing context throws that subject's guard-only exception, owned by its module, apart from its service exceptions, and shared by every guard reading it: 401 for identity (`AuthJwtGuardMissingException` for the JWT contexts, `UserGuardMissingException`, `ApiKeyGuardMissingException`), 403 for authorization (`PolicyGuardMissingException`, `WorkspaceGuardMissingException`, `WorkspaceMemberGuardMissingException`, `ProjectGuardMissingException`, `ProjectMemberGuardMissingException`), never 500. The kit's `RequestThrottleUserGuard` alone answers a missing `RequestActorStoreKey` with `RequestContextMissingException` (500): the request kit can name no feature exception (`layering.md`).
- A guard reading empty metadata fails closed: `PolicyGuard` denies an empty policy list (`PolicyAbilityFactory.handlerPolicies`, `src/modules/policy/factories/policy.factory.ts`).

## Decorators

- A `*Protected` decorator returns `applyDecorators(...)` and checks only its own arguments, when the route is decorated, so a bad route fails the boot: `RoleProtectedEmptyException`, `PolicyProtectedEmptyException`, `PolicyProtectedActionEmptyException`, `FeatureFlagKeyEmptyException`, `FeatureFlagKeyNestedException`, `RequestEnvProtectedEmptyException`. It checks no guard prerequisite and reads no `GUARDS_METADATA`. A raw `(target, propertyKey, descriptor)` body belongs only to a kit helper needing `descriptor.value` (`DocErrors` in `src/common/doc/decorators/doc.decorator.ts`, `Response` in `src/common/response/decorators/response.decorator.ts`).
- A `<Module>[<Concern>]Context()` param decorator (`http.md`, Controllers) returns the `I<Module>[<Concern>]Context` its module's guard or middleware wrote under `<Module>[<Concern>]ContextStoreKey`; a missing one throws `RequestContextMissingException` naming the key (500), so a route its guards do not satisfy fails on the first call. `IProjectContext.projectMember` alone is nullable. No other param decorator exists.
