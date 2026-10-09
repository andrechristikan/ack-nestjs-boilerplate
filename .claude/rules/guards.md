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
@AuthJwtAccessProtected()              // 13. JWT; a social login guard sits above 12, so the flag runs first
@ApiKeyProtected()                     // 14. API key; @ApiKeySystemProtected() on every system route
@FileUploadSingle() @RequestTimeout('1m') // 15. Upload routes: multipart interceptor, then timeout
@RequestThrottle({ user: true })       // 16. Throttle interceptor
@HttpCode(HttpStatus.OK)               // 17. @Post only
@Get('/endpoint')                      // 18. HTTP method, always last
```

- `@RequestThrottle` (`request.decorator.ts:60`) sits directly above `@HttpCode` or the method decorator. It takes `{ user: true, route? }` when JWT-protected and `{ route }` only on `public` and `system` (`EnumRequestThrottleRoute`).
- A `@Post` whose action creates the row its path names (`/create`, `/sign-up`, `/mobile-number/add`) keeps the default 201; every other `@Post` carries `@HttpCode(HttpStatus.OK)`.
- `@WorkspaceMemberProtected(...roles)` adds `WorkspaceRoleGuard` with roles (`workspace.decorator.ts:94`). `@ProjectMemberProtected(...roles)` uses `ProjectMemberGuard` with no roles and `ProjectRoleGuard` alone with roles (`project.decorator.ts:90`); `@ProjectMemberCurrent()` is valid only on the role-less form.
- Admin scope carries no `Workspace*` or `Project*` guard (they resolve `x-workspace-id` from CLS; an admin reads across workspaces): it scopes through `@RoleProtected` plus `@PolicyProtected` and a validated `:workspaceId` / `:projectId` param. `@RoleProtected` never lists `superAdmin`; `role.domain.ts:178` and `policy.domain.ts:44` pass it.
- Every workspace-scoped and project-scoped route in `user`, `shared`, and `public` carries `@FeatureFlagProtected('workspace')`, bare key; a metadata sub-key is asserted in the domain.

## Guards

- A guard reads transport inputs and delegates to a domain.
- A guard checks the store a guard below it wrote before calling the domain (`src/modules/workspace/guards/workspace.member.guard.ts:27-36`), so a domain `validate*Guard` takes a guard-provided subject non-null. A missing store throws that subject's guard-only exception, owned by its module, apart from its domain exceptions, and shared by every guard and `*Current` / `*Payload` decorator reading the store: 401 for identity (`AuthJwtGuardMissingException` for `request.user`, `UserGuardMissingException`, `ApiKeyGuardMissingException`), 403 for authorization (`PolicyGuardMissingException`, `WorkspaceGuardMissingException`, `WorkspaceMemberGuardMissingException`, `ProjectGuardMissingException`, `ProjectMemberGuardMissingException`), never 500. A stored subject whose requested field is null throws `RequestContextMissingException` (500); a handler never receives `null`.
- A guard reading empty metadata fails closed: `PolicyGuard` denies an empty policy list (`src/modules/policy/factories/policy.factory.ts:32`).

## Decorators

- A `*Protected` decorator returns `applyDecorators(...)` and checks only its own arguments, when the route is decorated, so a bad route fails the boot: `RoleProtectedEmptyException`, `PolicyProtectedEmptyException`, `PolicyProtectedActionEmptyException`, `FeatureFlagKeyEmptyException`, `FeatureFlagKeyNestedException`, `RequestEnvProtectedEmptyException`. It checks no guard prerequisite and reads no `GUARDS_METADATA`. A raw `(target, propertyKey, descriptor)` body belongs only to a kit helper needing `descriptor.value` (`src/common/doc/decorators/doc.decorator.ts:36`, `src/common/response/decorators/response.decorator.ts:48`).
- A param decorator reads CLS and, on a missing key or field, throws what Guards states; `@AuthJwtPayload` reads `request.user` instead.
