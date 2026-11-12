---
paths:
    - '**/guards/**'
    - '**/decorators/**'
    - 'src/modules/**/controllers/**'
---

# Guards and decorators

Exception classes, status codes, and the filter chain: `exceptions.md`.

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
@FeatureFlagProtected(...)             // 12. Feature flag; reads request.user, so above JWT
@RequestThrottle({ user: true })       // 13. Per-user throttle guard; runs after JWT
@AuthJwtAccessProtected()              // 14. JWT; a social login guard sits above 12, so the flag runs first
@ApiKeyProtected()                     // 15. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout('1m') // 16. Upload routes: multipart interceptor, then timeout
@HttpCode(HttpStatus.OK)               // 17. @Post only
@Get('/endpoint')                      // 18. HTTP method, always last
```

- `@RequestThrottle` (`src/common/request/decorators/request.decorator.ts`) mounts the per-user throttle guard directly above `@AuthJwtAccessProtected()`, so it runs after the JWT guard and before every guard that reads the database; a route with no JWT guard keeps the slot, directly above `@ApiKeyProtected()`. It takes `{ user: true, route? }` when JWT-protected and `{ route }` only on `public` and `system` (`EnumRequestThrottleRoute`).
- A `@Post` whose action creates the row its path names (`/create`, `/sign-up`, `/mobile-number/add`) keeps the default 201; every other `@Post` carries `@HttpCode(HttpStatus.OK)`.
- `@WorkspaceMemberProtected(...roles)` adds `WorkspaceRoleGuard` with roles (`src/modules/workspace/decorators/workspace.decorator.ts`). `@ProjectMemberProtected(...roles)` uses `ProjectMemberGuard` with no roles and `ProjectRoleGuard` alone with roles (`src/modules/project/decorators/project.decorator.ts`); the `projectMember` scope of `@RequestContextCurrent` is valid only on the role-less form (`ProjectRoleGuard` stores no member).
- Admin scope carries no `Workspace*` or `Project*` guard (they resolve `x-workspace-id` from CLS; an admin reads across workspaces): it scopes through `@RoleProtected` plus `@PolicyProtected` and a validated `:workspaceId` / `:projectId` param. `@RoleProtected` never lists `superAdmin`; `RoleService.validateRoleGuard` and `PolicyService.validatePolicyGuard` pass it.
- Every workspace-scoped and project-scoped route in `user`, `shared`, and `public` carries `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)`; the decorator takes an `EnumFeatureFlagKey` member, and a metadata sub-key, an `EnumFeatureFlagMetadataKey` member, is asserted in the service (`feature-flag.md`, Metadata).

## Guards

- A guard reads transport inputs and delegates to a service.
- A guard checks the store a guard below it wrote before calling the service (`WorkspaceMemberGuard.canActivate`, `src/modules/workspace/guards/workspace.member.guard.ts`), so a service `validate*Guard` takes a guard-provided subject non-null. A missing store throws that subject's guard-only exception, owned by its module, apart from its service exceptions, and shared by every guard reading the store: 401 for identity (`AuthJwtGuardMissingException` for `request.user`, `UserGuardMissingException`, `ApiKeyGuardMissingException`), 403 for authorization (`PolicyGuardMissingException`, `WorkspaceGuardMissingException`, `WorkspaceMemberGuardMissingException`, `ProjectGuardMissingException`, `ProjectMemberGuardMissingException`), never 500.
- A guard reading empty metadata fails closed: `PolicyGuard` denies an empty policy list (`PolicyAbilityFactory.handlerPolicies`, `src/modules/policy/factories/policy.factory.ts`).

## Decorators

- A `*Protected` decorator returns `applyDecorators(...)` and checks only its own arguments, when the route is decorated, so a bad route fails the boot: `RoleProtectedEmptyException`, `PolicyProtectedEmptyException`, `PolicyProtectedActionEmptyException`, `FeatureFlagKeyEmptyException`, `FeatureFlagKeyNestedException`, `RequestEnvProtectedEmptyException`. It checks no guard prerequisite and reads no `GUARDS_METADATA`. A raw `(target, propertyKey, descriptor)` body belongs only to a kit helper needing `descriptor.value` (`DocResponseError` in `src/common/doc/decorators/doc.decorator.ts`, `Response` in `src/common/response/decorators/response.decorator.ts`).
- `@RequestContextCurrent(scope)` (`src/common/request/decorators/request.decorator.ts`) is the one param decorator for the caller: the `EnumRequestContextScope` member picks the context type and the store keys and `request.user` fields it reads (`http.md`, Controllers), and a missing key throws `RequestContextMissingException` naming it (500), so a scope its guards do not satisfy fails on the first call. `@AuthJwtToken()` returns the raw refresh token, on the refresh route only (`security.md`), and `@AuthSocialEmail()` the provider-verified email, on the two social login routes only; `@RequestLanguageCurrent()` returns `RequestLanguageStoreKey`. No other param decorator reads a guard's store or `request.user`.
