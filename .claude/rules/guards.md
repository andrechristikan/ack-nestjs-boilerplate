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
@ProjectProtected(...)                 // 7.  Project and the caller's project member; pass roles to gate by role
@WorkspaceProtected(...)               // 8.  Workspace and the caller's member; pass roles to gate by role
@UserProtected()                       // 9.  User status
@FeatureFlagProtected(...)             // 10. Feature flag; reads RequestActorStoreKey, so above JWT
@RequestThrottleProtected({ user: true }) // 11. Per-user throttle guard; runs after JWT
@AuthJwtAccessProtected()              // 12. JWT; a social login guard sits above 10, so the flag runs first
@ApiKeyProtected()                     // 13. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout(RequestUploadTimeout) // 14. Upload routes: multipart interceptor, then timeout
@HttpCode(HttpStatus.OK)               // 15. @Post only
@Get('/endpoint')                      // 16. HTTP method, always last
```

- `@RequestThrottleProtected` (`src/common/request/decorators/request.decorator.ts`) mounts the per-user throttle guard directly above `@AuthJwtAccessProtected()`, so it runs after the JWT guard and before every guard that reads the database; a route with no JWT guard keeps the slot, directly above `@ApiKeyProtected()`. It takes `{ user: true, route? }` when JWT-protected and `{ route }` only on `public` and `system` (`EnumRequestThrottleRoute`).
- A `@Post` whose action creates the row its path names (`/create`, `/sign-up`, `/mobile-number/add`) keeps the default 201; every other `@Post` carries `@HttpCode(HttpStatus.OK)`, one that adds an embedded element included: it creates no row (`/content/:termPolicyId/add`).
- `@WorkspaceProtected(...roles)` mounts `WorkspaceGuard`, which loads the workspace and the caller's member in one call: a member row is always required, and with roles the member's role is in the list, an owner always passing. `@ProjectProtected(...roles)` mounts `ProjectGuard`, which loads the project and the caller's project member in one call: with no roles a member row is required; with roles a workspace owner or admin passes with the row or `null` as `projectMember`, and anyone else needs a row whose role is in the list.
- Admin scope carries no `Workspace*` or `Project*` guard (they resolve `x-workspace-id` from CLS; an admin reads across workspaces): it scopes through `@RoleProtected` plus `@PolicyProtected` and a validated `:workspaceId` / `:projectId` param. `@RoleProtected` never lists `superAdmin`; `RoleService.validateRoleGuard` and `PolicyService.validatePolicyGuard` pass it.
- Every workspace-scoped and project-scoped route in `user`, `shared`, and `public` carries `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)`; the decorator takes an `EnumFeatureFlagKey` member, ; a metadata sub-key: `service.md`, Shape.

## Guards

- A guard reads transport inputs and delegates to a service.
- The workspace and project guards read the database on every request; no cache sits in front of a membership read.
- `UserGuard` reads the user with its role and policies in one call (`UserWithRoleInclude`), with no cache in front.
- `TermPolicyGuard` reads the latest published policies with the caller's acceptances in one call, with no cache in front.
- A guard that loads its subject passes the id as it arrived, from the header through `WorkspaceIdStoreKey` (`WorkspaceGuard`) or the route (`ProjectGuard`), bound to no schema: the service answers a malformed id as that subject's not-found, never 422.
- A guard checks the context a guard below it wrote before calling the service (`ProjectGuard.canActivate`, `src/modules/project/guards/project.guard.ts`), so a service `validate*Guard` takes a guard-provided subject non-null. A missing context throws that subject's guard-only exception, owned by its module, apart from its service exceptions, and shared by every guard reading it: 401 for identity (`AuthJwtGuardMissingException` for the JWT contexts, `UserGuardMissingException`, `ApiKeyGuardMissingException`), 403 for authorization (`PolicyGuardMissingException`, `WorkspaceGuardMissingException`), never 500. The kit's `RequestThrottleUserGuard` alone answers a missing `RequestActorStoreKey` with `RequestContextMissingException` (500).
- A guard reading empty metadata fails closed: `PolicyGuard` denies an empty policy list (`PolicyAbilityFactory.handlerPolicies`, `src/modules/policy/factories/policy.ability.factory.ts`).

## Contexts

| Context | Carries | Loaded on the request by |
| --- | --- | --- |
| `IRequestContext` | `requestLog`, `language` | `RequestRequestLogMiddleware`, `RequestCustomLanguageMiddleware` |
| `IApiKeyContext` | `apiKey` | `ApiKeyXApiKeyGuard` |
| `IAuthJwtAccessContext` | `userId`, `sessionId`, `deviceOwnershipId`, `loginWith` | `AuthJwtAccessGuard` |
| `IAuthJwtRefreshContext` | the access fields and `token` | `AuthJwtRefreshGuard` |
| `IAuthSocialContext` | `email`, `emailVerified`, `subject` | `AuthSocialGoogleGuard`, `AuthSocialAppleGuard` |
| `IUserContext` | `user`, the row with its role | `UserGuard` |
| `IWorkspaceContext` | `workspaceId`, `workspace`, `workspaceMember` | `WorkspaceGuard` |
| `IProjectContext` | `project`, `projectMember` | `ProjectGuard` |

A context row is used whole, a route that returns the resource included (the profile), and no use case or service reads it again.

## Decorators

- A `*Protected` decorator returns `applyDecorators(...)` and checks only its own arguments, when the route is decorated, so a bad route fails the boot: `RoleProtectedEmptyException`, `PolicyProtectedEmptyException`, `PolicyProtectedActionEmptyException`, `FeatureFlagKeyEmptyException`, `FeatureFlagKeyNestedException`, `RequestEnvProtectedEmptyException`. It checks no guard prerequisite and reads no `GUARDS_METADATA`. A raw `(target, propertyKey, descriptor)` body belongs only to a kit helper needing `descriptor.value` (`DocErrors` in `src/common/doc/decorators/doc.decorator.ts`, `Response` in `src/common/response/decorators/response.decorator.ts`).
- A `<Module>[<Concern>]Context()` param decorator (`http.md`, Controllers) returns the `I<Module>[<Concern>]Context` its module's guard or middleware wrote under `<Module>[<Concern>]ContextStoreKey`; a missing one throws `RequestContextMissingException` naming the key (500), so a route its guards do not satisfy fails on the first call. `RequestContext()` alone assembles its value from `RequestLogStoreKey` and `RequestLanguageStoreKey`. `IProjectContext.projectMember` alone is nullable. No other param decorator exists.
