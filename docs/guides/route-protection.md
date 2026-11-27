---
title: Route Protection Guide
description: Stack the protection decorators on a route in the fixed order, from the API key, the JWT, and the per-user throttle to the feature-flag, user, workspace and project, role and policy, and term-policy gates.
---

# Route Protection Guide

This guide shows how to protect a route, for a developer who adds a controller method and decides which guards it needs.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Authorization][ref-doc-concept-authorization]: what each gate decides and why the order matters
- [Authentication][ref-doc-concept-authentication]: the JWT and social guards
- [API Key][ref-doc-concept-api-key]: the default and system keys
- [Term Policy][ref-doc-concept-term-policy]: the acceptance gate
- [Security][ref-doc-concept-security]: the throttle tiers
- [Decorators and Guards Reference][ref-doc-reference-decorators-and-guards]: the full decorator order, each guard's store key, and the missing-entry exceptions
- [Feature Flag][ref-doc-feature-flag]: the flags and their metadata
- [Role Guide][ref-doc-guide-role]: the roles and policies a gate checks

## Prerequisites

- A controller method that calls one use case ([Module Guide][ref-doc-guide-module]).
- The scope of the route: `/public`, `/system`, `/admin`, `/user`, or `/shared`. The scope picks the decorators below.
- For an admin route, the policy subject and actions it needs ([Role Guide][ref-doc-guide-role]).
- For a flag-gated route, an `EnumFeatureFlagKey` member and its seeded flag.

## Steps

Write the decorators from the bottom of the stack up. Nest runs the decorator nearest the method first, so each gate runs after the ones below it. Steps 1 to 10 each add a gate.

1. Add the key decorator directly above `@HttpCode` when the route has one, otherwise directly above the HTTP method: `@ApiKeyProtected()`, or `@ApiKeySystemProtected()` on a `/system` route. A `/system` route carries no JWT or user guard. Every route but `GET /api/public/hello` (`HelloPublicController`) carries one.
2. Add the route tier directly above the key decorator when the route needs one. The tier is optional and one of `strict`, `moderate`, or `relaxed` (the numbers are in [Rate limiting][ref-doc-concept-security]): `@RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })`. No `/system` route carries one. A signed-in route that needs a tier adds `route` beside `user: true` in step 3.
3. On a signed-in route, add `@AuthJwtAccessProtected()` directly above the key decorator, then the per-user throttle `@RequestThrottleProtected({ user: true })` directly above it, so the throttle runs after the JWT guard and counts by the signed-in user. A `/shared` route takes the same signed-in stack as a `/user` route: key, JWT, per-user throttle, user, term policy. Only the refresh route uses `@AuthJwtRefreshProtected()`.
4. Add `@FeatureFlagProtected(EnumFeatureFlagKey.<key>)` above the throttle when a flag gates the route. It sits above the JWT decorator so the flag guard sees the signed-in user. On a public route the flag guard has no signed-in user and takes the anonymous branch through `x-anonymous-id`. A workspace-scoped or project-scoped route in `/user`, `/shared`, or `/public` adds `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)` here.
5. On a social login route, add `@AuthSocialGoogleProtected()` or `@AuthSocialAppleProtected()` directly above the flag decorator, so the flag answers before the provider token is verified.
6. Add `@UserProtected()` above the flag. It loads the user, its role, and its policies, and every later guard reads that user. `@UserProtected(false)` skips the verified-email check.
7. On a `/user` or `/shared` route that works inside a workspace, add `@WorkspaceProtected(...roles)` above `@UserProtected()`. It takes the workspace from the `x-workspace-id` header. Add `@ProjectProtected(...roles)` above the workspace decorator for a route with a `:projectId` parameter. With no roles, the workspace guard needs a workspace member row and the project guard a project member row. With roles, the member's role must be listed, a workspace `owner` always passes the workspace list, and a workspace `owner` or `admin` passes the project list without a project member row.
8. On an `/admin` route, add `@RoleProtected(EnumRoleType.admin)` above `@UserProtected()` and `@PolicyProtected({ subject, action: [...] })` above it. A `superAdmin` is never listed, because both guards pass it. An admin route carries no workspace or project guard. `@RoleProtected` also limits one `/user` route by type (`@RoleProtected(EnumRoleType.user)` on `/user/self/delete`).
9. Add `@TermPolicyAcceptanceProtected()` above every guard, on every signed-in route a user must be able to use only after accepting the legal documents. Four routes leave it off: the accept route, the pending list, refresh, and logout ([Acceptance at sign-up and per request][ref-doc-concept-term-policy]).
10. Add `@RequestEnvProtected(...envs)` where the route is limited to some environments. It reads no store entry, so its place only decides which rejection a caller sees first.
11. Write the documentation and response decorators at the top (`@Doc`, then `@Response`, `@ResponsePagination`, or `@ResponseFile`), and `@HttpCode` and the HTTP method at the bottom.
12. Read the guards' results in the handler with the param decorators: `@UserContext()`, `@AuthJwtAccessContext()`, `@ApiKeyContext()`, `@WorkspaceContext()`, `@ProjectContext()`, and `@RequestContext()`. Pass each context to the use case and never read it again below.

An admin route stacks the gates like this (`src/modules/session/controllers/session.admin.controller.ts`):

```typescript
@Doc({
    summary: 'admin get all user sessions',
    description:
        'orderBy presets: latest (createdAt descending, default), recentlyUpdated (updatedAt descending).',
})
@ResponsePagination('session.list', { schema: SessionResponseSchema })
@TermPolicyAcceptanceProtected()
@PolicyProtected(
    {
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
    },
    {
        subject: EnumPolicySubject.session,
        action: [EnumPolicyAction.read],
    }
)
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@RequestThrottleProtected({ user: true })
@AuthJwtAccessProtected()
@ApiKeyProtected()
@Get('/list')
```

A workspace route stacks them like this (`src/modules/project/controllers/project.user.controller.ts`):

```typescript
@Doc({ summary: 'create a project in the current workspace' })
@Response('project.create', { schema: ProjectResponseSchema })
@TermPolicyAcceptanceProtected()
@WorkspaceProtected(EnumWorkspaceMemberRole.admin)
@UserProtected()
@FeatureFlagProtected(EnumFeatureFlagKey.workspace)
@RequestThrottleProtected({ user: true })
@AuthJwtAccessProtected()
@ApiKeyProtected()
@Post('/create')
```

A social login route puts its guard above the flag (`src/modules/user/controllers/user.public.controller.ts`):

```typescript
@Doc({ summary: 'login with social google' })
@Response('user.loginWithSocialGoogle', {
    schema: UserLoginResponseSchema,
})
@AuthSocialGoogleProtected()
@FeatureFlagProtected(EnumFeatureFlagKey.loginWithGoogle)
@RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
@ApiKeyProtected()
@HttpCode(HttpStatus.OK)
@Post('/login/social/google')
```

## Check the result

1. Run the typecheck and start the API. A decorator argument error fails the boot: an empty `@RoleProtected()`, an empty `@PolicyProtected()` or a policy with an empty `action` list, a nested or empty flag key, and an empty `@RequestEnvProtected()`.

    ```bash
    pnpm typecheck
    pnpm start:dev
    ```

2. Call the route with no key. It answers `ApiKeyXApiKeyRequiredException` (401, `50700`).
3. Add the key header and no token. A signed-in route answers `AuthJwtAccessTokenInvalidException` (401, `50800`). `<key>:<secret>` is the seeded default API key ([Seeded rows][ref-doc-reference-database-apikey]). The path below is an example of a signed-in route:

    ```bash
    curl -i -H 'x-api-key: <key>:<secret>' http://localhost:3000/api/v1/shared/user/profile/get
    ```

4. Sign in as a seeded user with `POST /api/v1/public/user/login/credential` ([Seeded rows][ref-doc-reference-database-user]) and call the route with the key and the access token. A misordered stack boots and answers the guard-only exception of the missing entry on every such call, such as `UserGuardMissingException` (401, `51022`) or `PolicyGuardMissingException` (403, `51103`): [Missing entries][ref-doc-reference-decorators-missing]. A flag decorator below the JWT decorator boots and evaluates the flag for an anonymous caller with no exception, so check the order against the [Decorators and Guards Reference][ref-doc-reference-decorators-and-guards].
5. Call the route with the token of a user the gates should refuse: a `user` role on an admin route answers `RoleForbiddenException` (403, `50502`), a missing policy answers `PolicyForbiddenException` (403, `51100`), and a user with a pending document answers `TermPolicyRequiredInvalidException` (403, `51504`).
6. Open Swagger at `http://localhost:3000/docs`. Each guard decorator adds its security scheme and its error kit to the operation.

## Related tasks

- [Role Guide][ref-doc-guide-role]: create the role and the policy the route checks.
- [Schema Guide][ref-doc-guide-schema]: write the request and response schemas of the route.
- [API Documentation Guide][ref-doc-guide-api-documentation]: add `@Doc` and the error kits.
- [Feature Flag][ref-doc-feature-flag]: gate the route with a flag and read its metadata.

<!-- REFERENCES -->

[ref-doc-concept-authorization]: ../concepts/authorization.md
[ref-doc-concept-authentication]: ../concepts/authentication.md
[ref-doc-concept-api-key]: ../concepts/api-key.md
[ref-doc-concept-term-policy]: ../concepts/term-policy.md#acceptance-at-sign-up-and-per-request
[ref-doc-concept-security]: ../concepts/security.md#rate-limiting
[ref-doc-reference-decorators-and-guards]: ../reference/decorators-and-guards.md
[ref-doc-reference-database-apikey]: ../reference/database.md#apikey
[ref-doc-reference-database-user]: ../reference/database.md#user
[ref-doc-reference-decorators-missing]: ../reference/decorators-and-guards.md#missing-entries
[ref-doc-feature-flag]: ../feature-flag.md
[ref-doc-guide-role]: role.md
[ref-doc-guide-module]: module.md
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-api-documentation]: api-documentation.md
