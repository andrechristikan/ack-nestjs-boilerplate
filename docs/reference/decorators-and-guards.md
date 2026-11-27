---
title: Decorators and Guards Reference
description: The decorator order of a route, each protection decorator with its guard, store key, and rejections, the param decorators, the missing-entry exceptions, and the request store keys.
---

# Decorators and Guards Reference

This page lists the facts of the protection decorators, for a developer who looks up an order, a guard, a store key, or the exception of an empty entry.

## Table of Contents

- [Related Documents](#related-documents)
- [Decorator order](#decorator-order)
- [Decorators](#decorators)
- [Param decorators](#param-decorators)
- [Missing entries](#missing-entries)
- [Request store](#request-store)

## Related Documents

- [Authorization][ref-doc-concept-authorization]: what each gate decides
- [Authentication][ref-doc-concept-authentication]: the JWT and social guards
- [API Key][ref-doc-concept-api-key]: the key guards
- [Request Pipeline][ref-doc-concept-request-pipeline]: where guards sit on a request, and the request store in context
- [Security][ref-doc-concept-security]: the throttle tiers and their numbers
- [Route Protection Guide][ref-doc-guide-route-protection]: stack the decorators on a route
- [Status Codes][ref-doc-reference-status-codes]: the code and message of each exception named here
- [HTTP Contract][ref-doc-reference-http-contract]: the throttle rejection
- [Workspace][ref-doc-workspace]: the workspace guard in full
- [Project][ref-doc-project]: the project guard in full
- [Feature Flag][ref-doc-feature-flag]: the flag guard in full

## Decorator order

Nest runs the guards of a method bottom-up: the decorator nearest the method runs first. A route takes only the slots it needs, and the relative order of the slots it takes never changes. Slots 1 to 3 and 14 to 16 mount no guard.

| Slot | Decorator | Mounts |
| --- | --- | --- |
| 1 | `@Doc` | the OpenAPI operation and the global error kit |
| 2 | `@Response`, `@ResponsePagination`, `@ResponseFile` | the response schema and interceptor |
| 3 | `@Header(name, value)` | a static response header, when set |
| 4 | `@TermPolicyAcceptanceProtected()` | `TermPolicyGuard` |
| 5 | `@PolicyProtected({ ... })` | `PolicyGuard`, admin routes |
| 6 | `@RoleProtected(...)` | `RoleGuard`, admin routes and one `/user` route that limits by role type |
| 7 | `@ProjectProtected(...)` | `ProjectGuard` |
| 8 | `@WorkspaceProtected(...)` | `WorkspaceGuard` |
| 9 | `@UserProtected()` | `UserGuard` |
| 10a | `@AuthSocialGoogleProtected()`, `@AuthSocialAppleProtected()` | `AuthSocialGoogleGuard`, `AuthSocialAppleGuard`, directly above `@FeatureFlagProtected(...)` on a social login route |
| 10 | `@FeatureFlagProtected(...)` | `FeatureFlagGuard` |
| 11 | `@RequestThrottleProtected({ user: true })` | `RequestThrottleUserGuard` |
| 12 | `@AuthJwtAccessProtected()`, `@AuthJwtRefreshProtected()` | `AuthJwtAccessGuard`, or `AuthJwtRefreshGuard` on the refresh route only |
| 13 | `@ApiKeyProtected()`, `@ApiKeySystemProtected()` | `ApiKeyXApiKeyGuard`, `ApiKeyXApiKeyTypeGuard` |
| 14 | `@FileUploadSingle()`, `@RequestTimeout(...)` | `@FileUploadSingle()` mounts `FileUploadErrorInterceptor` and the multipart `FileInterceptor` on upload routes; `@RequestTimeout(...)` mounts nothing and sets the metadata the global `RequestTimeoutInterceptor` reads |
| 15 | `@HttpCode(HttpStatus.OK)` | the status of a `@Post` that creates no row |
| 16 | `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete` | the HTTP method, always last |

Guards therefore run in this order: the API key, the JWT, the per-user throttle, the feature flag, the user, the workspace, the project, the role, the policy, and the term policy. Two global `APP_GUARD` throttle guards run before every route guard: `RequestThrottleDefaultGuard`, the per-IP default, and `RequestThrottleRouteGuard`, which reads the `{ route }` tier.

Placement rules:

- A guard that reads what another guard writes sits above it in source, so it runs after it.
- `@FeatureFlagProtected()` sits above the JWT decorator so it runs after the JWT guard and reads the acting user id. A social login guard sits above the flag, so the flag answers before the provider token is verified.
- `@RequestThrottleProtected` mounts the per-user guard directly above `@AuthJwtAccessProtected()`, so it runs right after the JWT guard. It takes `{ user: true, route? }` on a JWT-protected route, and `{ route }` only on a `/public` or `/system` route, where it sits directly above the key decorator. The global `RequestThrottleRouteGuard` reads the route tier and runs before every route guard.
- `@RequestEnvProtected(...envs)` reads no store entry, so its slot only decides which rejection a caller sees first.
- A `@Post` whose action creates the row its path names (`/create`, `/sign-up`, `/mobile-number/add`) keeps the default 201. Every other `@Post` carries `@HttpCode(HttpStatus.OK)`, one that adds an embedded element included.
- Activity logging takes no slot: the use case adds the entry to its transaction.
- An `/admin` route carries `@RoleProtected()` and `@PolicyProtected()` and no workspace or project guard, and takes the workspace or project id from the path. A `/user` or `/shared` route that works inside a workspace uses the workspace guard, and the project guard under `:projectId`.
- Every workspace-scoped and project-scoped route in `user`, `shared`, and `public` carries `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)`.

## Decorators

Every `*Protected` decorator returns `applyDecorators(...)` and checks only its own arguments, when the route is decorated, so a bad argument fails the boot. It checks no guard prerequisite. Every entry holds the same fields: Guard, Arguments, Reads, Writes, Rejects, and Empty entry.

### `@ApiKeyProtected()` and `@ApiKeySystemProtected()`

- Guard: `ApiKeyXApiKeyGuard`, then `ApiKeyXApiKeyTypeGuard`.
- Arguments: none. `@ApiKeyProtected()` sets the allowed type `default`, and `@ApiKeySystemProtected()` sets `system`.
- Reads: the `x-api-key` header.
- Writes: `ApiKeyContextStoreKey`, an `IApiKeyContext` with the `apiKey` row.
- Rejects: `ApiKeyXApiKeyGuard` answers `ApiKeyXApiKeyRequiredException` (401, `50700`), `ApiKeyXApiKeyInvalidException` (401, `50701`), and `ApiKeyExpiredException` (400, `50703`). `ApiKeyXApiKeyTypeGuard` answers `ApiKeyXApiKeyForbiddenException` (403, `50702`) for a wrong type.
- Empty entry: the type guard answers `ApiKeyGuardMissingException` (401, `50707`).

### `@AuthJwtAccessProtected()`

- Guard: `AuthJwtAccessGuard`, over the Passport strategy `AuthJwtAccessStrategy`.
- Arguments: none.
- Reads: the `Authorization: Bearer` access token and its session ([Per-request check][ref-doc-concept-session-check]).
- Writes: `AuthJwtAccessContextStoreKey`, an `IAuthJwtAccessContext` (`userId`, `sessionId`, `deviceOwnershipId`, `loginWith`), and `RequestActorStoreKey`, the user id.
- Rejects: `AuthJwtAccessTokenInvalidException` (401, `50800`), `SessionRevokedException` (401, `50401`), and `AuthProviderUnavailableException` (503, `50808`) for an unreachable JWKS endpoint.
- Empty entry: none.

### `@AuthJwtRefreshProtected()`

- Guard: `AuthJwtRefreshGuard`. It reads no session. Only the refresh route mounts it.
- Arguments: none.
- Reads: the `Authorization: Bearer` refresh token.
- Writes: `AuthJwtRefreshContextStoreKey`, an `IAuthJwtRefreshContext` (the access fields and the raw `token`), and `RequestActorStoreKey`.
- Rejects: `AuthJwtRefreshTokenInvalidException` (401, `50801`) and `AuthProviderUnavailableException` (503, `50808`).
- Empty entry: none.

### `@AuthSocialGoogleProtected()` and `@AuthSocialAppleProtected()`

- Guards: `AuthSocialGoogleGuard`, `AuthSocialAppleGuard`.
- Arguments: none.
- Reads: the `Authorization: Bearer` provider ID token.
- Writes: `AuthSocialContextStoreKey`, an `IAuthSocialContext` (`email`, `emailVerified`, `subject`).
- Rejects: `AuthSocialGoogleRequiredException` (401, `50802`), `AuthSocialAppleRequiredException` (401, `50804`), `AuthSocialGoogleInvalidException` (401, `50803`), `AuthSocialAppleInvalidException` (401, `50805`), `AuthSocialGoogleNotConfiguredException` (501, `50806`), `AuthSocialAppleNotConfiguredException` (501, `50807`), `AuthProviderUnavailableException` (503, `50808`), and `AuthSocialNonceInvalidException` (401, `50812`).
- Empty entry: none.

### `@RequestThrottleProtected(options)`

- Guard: `RequestThrottleUserGuard`.
- Arguments: `{ user?: boolean, route?: EnumRequestThrottleRoute }`.
- Reads: `RequestActorStoreKey`, when `user` is set. A `{ route }` only decorator counts nothing in this guard.
- Writes: nothing.
- Rejects: `ThrottlerException` (429, `statusCode` `429`, key `tooManyRequests`), described in the [HTTP Contract][ref-doc-reference-http-contract].
- Empty entry: a missing actor answers `RequestContextMissingException` (500, `50304`). It is the one guard whose empty entry is not a guard-only exception.

### `@FeatureFlagProtected(key)`

- Guard: `FeatureFlagGuard`.
- Arguments: one top-level `EnumFeatureFlagKey` member. A value with an empty segment or a `.` throws `FeatureFlagKeyEmptyException` or `FeatureFlagKeyNestedException` when the route is decorated.
- Reads: `RequestActorStoreKey` and the optional `x-anonymous-id` header. An absent actor takes the anonymous branch.
- Writes: nothing.
- Rejects: `FeatureFlagDisabledException` (404, `50601`).
- Empty entry: none.

### `@UserProtected()`

- Guard: `UserGuard`.
- Arguments: the optional `isVerified`, which defaults to `true`. `@UserProtected(false)` skips the verified-email check.
- Reads: the access context, else the refresh context. It then loads the user with its role and policies in one call.
- Writes: `UserContextStoreKey`, an `IUserContext` that holds the `user` row with its role and the role's policies.
- Rejects: `UserAccountNotFoundException` (401, `51019`), `UserBlockedForbiddenException` (403, `51008`), `UserInactiveForbiddenException` (403, `51007`), `UserPasswordExpiredException` (403, `51010`) on a credential login, and `UserEmailNotVerifiedException` (403, `51015`).
- Empty entry: `AuthJwtGuardMissingException` (401, `50809`).

### `@WorkspaceProtected(...roles)`

- Guard: `WorkspaceGuard`. It loads the workspace and the caller's member in one call.
- Arguments: `EnumWorkspaceMemberRole` values. With none, a member row is required. With roles, the member's role must be listed, and an `owner` always passes.
- Reads: `WorkspaceIdStoreKey`, the raw `x-workspace-id` header, and the user context.
- Writes: `WorkspaceContextStoreKey`, an `IWorkspaceContext` (`workspaceId`, `workspace`, `workspaceMember`).
- Rejects: `WorkspaceHeaderMissingException` (400, `51621`), `WorkspaceNotFoundException` (404, `51600`) for a malformed id or a workspace that is not active, `WorkspaceMemberForbiddenException` (403, `51601`), and `WorkspaceRoleForbiddenException` (403, `51602`). `WorkspaceIdMiddleware` always writes the key, the header or `null`, so a missing header is a client error, not a misordered stack.
- Empty entry: `UserGuardMissingException` (401, `51022`).

### `@ProjectProtected(...roles)`

- Guard: `ProjectGuard`. It loads the project and the caller's project member in one call.
- Arguments: `EnumProjectMemberRole` values. With none, a member row is required. With roles, a workspace `owner` or `admin` passes with the row or with `null`, and anyone else needs a row whose role is listed.
- Reads: the `:projectId` route parameter, as it arrived, and the workspace context.
- Writes: `ProjectContextStoreKey`, an `IProjectContext` (`project`, and `projectMember`, which is the one nullable field).
- Rejects: `ProjectNotFoundException` (404, `51700`), `ProjectMemberForbiddenException` (403, `51701`), and `ProjectRoleForbiddenException` (403, `51702`). A route with no `:projectId` answers `RequestContextMissingException` (500, `50304`).
- Empty entry: `WorkspaceGuardMissingException` (403, `51622`).

### `@RoleProtected(...types)`

- Guard: `RoleGuard`.
- Arguments: one or more `EnumRoleType` values. An empty list throws `RoleProtectedEmptyException` when the route is decorated. `superAdmin` is never listed in `@RoleProtected(...)`: `RoleService.validateRoleGuard` passes it.
- Reads: the user context.
- Writes: `PolicyStoreKey`, the policy rows of the caller's role. A `superAdmin` and a `user` role store an empty list.
- Rejects: `RoleForbiddenException` (403, `50502`).
- Empty entry: `UserGuardMissingException` (401, `51022`).

### `@PolicyProtected(...policies)`

- Guard: `PolicyGuard`.
- Arguments: one or more `{ subject, action[] }` policies. A call with no policy throws `PolicyProtectedEmptyException`, and a policy with an empty `action` list throws `PolicyProtectedActionEmptyException`, when the route is decorated.
- Reads: the user context and `PolicyStoreKey`.
- Writes: nothing.
- Rejects: `PolicyForbiddenException` (403, `51100`). A `superAdmin` passes, and an empty list denies.
- Empty entry: `UserGuardMissingException` (401, `51022`) for the user, then `PolicyGuardMissingException` (403, `51103`) for the policies.

### `@TermPolicyAcceptanceProtected(...types)`

- Guard: `TermPolicyGuard`.
- Arguments: the optional required types. With none it checks `termsOfService` and `privacy`, and no route passes arguments.
- Reads: the user context, then the latest published policy of each required type with the user's acceptances.
- Writes: nothing.
- Rejects: `TermPolicyRequiredInvalidException` (403, `51504`).
- Empty entry: `UserGuardMissingException` (401, `51022`).

### `@RequestEnvProtected(...envs)`

- Guard: `RequestEnvGuard`.
- Arguments: one or more environments. An empty call throws `RequestEnvProtectedEmptyException` when the route is decorated.
- Reads: the application environment.
- Writes: nothing.
- Rejects: `RequestEnvNotAllowedException` (404, `50302`), which looks like an unknown route.
- Empty entry: none.

## Param decorators

A param decorator returns the context its module's guard or middleware wrote under the store key. `@RequestContext()` reads the two middleware keys, `RequestLogStoreKey` and `RequestLanguageStoreKey`. It reads the store of the request, and a missing context throws `RequestContextMissingException` (500, `50304`) naming the key, so a route its guards do not satisfy fails on the first call. The controller passes the value down to the use case.

| Decorator | Returns | Store key |
| --- | --- | --- |
| `@RequestContext()` | `IRequestContext`: `requestLog` and `language` | `RequestLogStoreKey`, `RequestLanguageStoreKey` |
| `@ApiKeyContext()` | `IApiKeyContext` | `ApiKeyContextStoreKey` |
| `@AuthJwtAccessContext()` | `IAuthJwtAccessContext` | `AuthJwtAccessContextStoreKey` |
| `@AuthJwtRefreshContext()` | `IAuthJwtRefreshContext` | `AuthJwtRefreshContextStoreKey` |
| `@AuthSocialContext()` | `IAuthSocialContext` | `AuthSocialContextStoreKey` |
| `@UserContext()` | `IUserContext` | `UserContextStoreKey` |
| `@WorkspaceContext()` | `IWorkspaceContext`, all three members non-null | `WorkspaceContextStoreKey` |
| `@ProjectContext()` | `IProjectContext` | `ProjectContextStoreKey` |

## Missing entries

Each guard checks, at request time, the entry a guard running earlier wrote. An empty entry throws the guard-only exception of the missing subject, owned by that subject's module and shared by every guard that reads it. Identity subjects answer 401 and authorization subjects answer 403, for the guard-only exceptions of this table. The per-user throttle's empty actor is the exception and answers 500. Nothing checks the stack when the route is decorated, so a misordered stack boots and fails on every request.

| Guard | Reads | Throws when the entry is empty |
| --- | --- | --- |
| `ApiKeyXApiKeyTypeGuard` | the API key context | `ApiKeyGuardMissingException` (401, `50707`) |
| `UserGuard` | the access or refresh context | `AuthJwtGuardMissingException` (401, `50809`) |
| `RoleGuard` | the user context | `UserGuardMissingException` (401, `51022`) |
| `PolicyGuard` | the user context, then the policies | `UserGuardMissingException`, then `PolicyGuardMissingException` (403, `51103`) |
| `TermPolicyGuard` | the user context | `UserGuardMissingException` |
| `WorkspaceGuard` | the user context | `UserGuardMissingException` |
| `ProjectGuard` | the workspace context | `WorkspaceGuardMissingException` (403, `51622`) |
| `RequestThrottleUserGuard` | the actor id | `RequestContextMissingException` (500, `50304`) |

## Request store

`RequestStoreService` keeps one store per request, keyed by `*StoreKey` constants: add a key, never a second store. Guards and middlewares write the contexts and the ids. A list use case writes `PaginationStoreKey`, which `ResponsePaginationInterceptor` reads. Each guard reads the contexts earlier guards wrote, the kit reads the ids and the actor id, and a param decorator reads a context for the controller. A feature service, use case, or processor never reads the store: the controller passes the contexts down. A job runs with no store.

| Key | Value | Written by |
| --- | --- | --- |
| `RequestIdStoreKey` | the request id | `RequestRequestIdMiddleware` |
| `RequestCorrelationIdStoreKey` | the correlation id | `RequestRequestIdMiddleware` |
| `RequestLogStoreKey` | `IRequestLog`: client IP, user agent, geo-location, resolved once | `RequestRequestLogMiddleware` |
| `RequestLanguageStoreKey` | the resolved language | `RequestCustomLanguageMiddleware` |
| `RequestVersionStoreKey` | the resolved API version | `RequestUrlVersionMiddleware` |
| `RequestActorStoreKey` | the acting user id | `AuthJwtAccessGuard`, `AuthJwtRefreshGuard` |
| `PaginationStoreKey` | the page state of a list | the list use case |
| `WorkspaceIdStoreKey` | the raw `x-workspace-id` header, or `null` | `WorkspaceIdMiddleware` |
| `ApiKeyContextStoreKey` | `IApiKeyContext` | `ApiKeyXApiKeyGuard` |
| `AuthJwtAccessContextStoreKey` | `IAuthJwtAccessContext` | `AuthJwtAccessGuard` |
| `AuthJwtRefreshContextStoreKey` | `IAuthJwtRefreshContext` | `AuthJwtRefreshGuard` |
| `AuthSocialContextStoreKey` | `IAuthSocialContext` | the social guards |
| `UserContextStoreKey` | `IUserContext` | `UserGuard` |
| `PolicyStoreKey` | the policy rows of the caller's role | `RoleGuard` |
| `WorkspaceContextStoreKey` | `IWorkspaceContext` | `WorkspaceGuard` |
| `ProjectContextStoreKey` | `IProjectContext` | `ProjectGuard` |

- The actor id feeds the logger mixin, the audit stamping of the database client, the response metadata, the feature-flag guard, and the per-user throttle.
- The raw refresh token lives in `IAuthJwtRefreshContext` only, never in a job payload or a log.
- `IRequestContext.requestLog` is resolved once per request and never resolved again.

<!-- REFERENCES -->

[ref-doc-concept-authorization]: ../concepts/authorization.md
[ref-doc-concept-authentication]: ../concepts/authentication.md
[ref-doc-concept-api-key]: ../concepts/api-key.md
[ref-doc-concept-request-pipeline]: ../concepts/request-pipeline.md#request-store
[ref-doc-concept-security]: ../concepts/security.md#rate-limiting
[ref-doc-concept-session-check]: ../concepts/session.md#per-request-check
[ref-doc-guide-route-protection]: ../guides/route-protection.md
[ref-doc-reference-status-codes]: status-codes.md
[ref-doc-reference-http-contract]: http-contract.md
[ref-doc-workspace]: ../concepts/workspace.md
[ref-doc-project]: ../concepts/project.md
[ref-doc-feature-flag]: ../concepts/feature-flag.md
