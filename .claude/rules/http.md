---
paths:
  - "src/modules/**/controllers/**"
  - "src/router/**"
  - "src/app/**"
---

# HTTP layer

## Decorator order

Nest runs guards bottom-up: the decorator nearest the method executes first, so a guard that reads state
another guard sets sits above it. Reordering is a defect even when boot passes.

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation + global error kit
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3.  Term policy
@PolicyProtected({...})                // 4.  CASL policy, admin routes
@RoleProtected(...)                    // 5.  Role, admin routes
@ProjectMemberProtected()              // 6.  Project membership
@ProjectProtected()                    // 7.  Project exists
@WorkspaceMemberProtected(...)         // 8.  Workspace membership; pass roles to also gate by role
@WorkspaceProtected()                  // 9.  Workspace exists
@UserProtected()                       // 10. User status
@FeatureFlagProtected(...)             // 11. Feature flag; reads request.user, so above JWT
@AuthJwtAccessProtected()              // 12. JWT (access or refresh); a social guard takes this slot
@ApiKeyProtected()                     // 13. API key
@HttpCode(HttpStatus.OK)               // 14. Only on @Post; every other method defaults to 200
@Get('/endpoint')                      // 15. HTTP method, always last
```

- `@RequestThrottle` (`src/common/request/decorators/request.decorator.ts:55`) mounts an interceptor, outside
  this order. Every JWT-protected handler carries exactly one `@RequestThrottle({ user: true, route?:
  EnumRequestThrottleRoute.<tier> })`; `public` and `system` have no `req.user`, so none there.
- `@WorkspaceMemberProtected(...roles)` adds `WorkspaceRoleGuard` with roles (`workspace.decorator.ts:76`).
  `@ProjectMemberProtected(...roles)` uses `ProjectMemberGuard` with no roles and `ProjectRoleGuard` alone with
  roles (`project.decorator.ts:82`); `@ProjectMemberCurrent()` is valid only on the role-less form.
- Admin scope carries no `Workspace*` or `Project*` guard: those resolve `x-workspace-id` from CLS and an admin
  reads across every workspace. Admin scoping is `@RoleProtected` plus `@PolicyProtected`, with a validated
  `:workspaceId` / `:projectId` path param when narrowed. `@RoleProtected` never lists `superAdmin`:
  `role.domain.ts:181` and `policy.domain.ts:50` bypass both gates for it.
- Every workspace-scoped and project-scoped route in `user`, `shared`, and `public` carries
  `@FeatureFlagProtected('workspace')`, bare key; a metadata sub-key is asserted in the domain.

## Controllers

- One endpoint, one `<Module>HttpService` method; no domain, repository, business rule, or hand-built
  pagination metadata. Pass the whole request DTO (`null-safety.md`).
- One controller per scope (`admin public user system shared`), registered by
  `src/router/http/router.http.<scope>.module.ts` with the feature's `<Module>HttpModule` in `imports`, never
  the domain module. `/admin` is offset pagination; every other scope is cursor.
- Every handler is `async` and returns `IResponseReturn<T>`, `IResponsePaginationReturn<T>`, `IResponseFileReturn`, or `Promise<void>`.
- A path or query value binds a zod schema on the decorator, validated by the same `RequestSchemaValidationPipe`
  as a body: `@Param('userId', { schema: RequestMongoIdSchema })`, `@Query('x', { schema:
  RequestMongoIdSchema.optional() })`, `RequestRequiredStringSchema` for a token or slug. Params are camelCase
  and explicit, never a bare `:id`; the template and the `@Param` key agree or the value is `undefined` at
  runtime. A body field never duplicates a path param. File presence is a file pipe (`file.md`). A new `x-*`
  header is also registered in `request.config.ts` `cors.allowedHeader` (`config.md`).

## Route path shape

Everything in the controller's `path:` is its own resource: `/<action>[/:<id>[/<target>]]`. A noun a route
decorator introduces opens a sub-resource: `/<sub-resource>[/:<scope-id>][/:<id>][/<target>]/<action>`, action
last. The action is one verb; `<verb>-all` only with no row id; a target is its own segment, never folded into
the verb (`/update/:id/status`); one verb per path; method and verb agree. A resource noun is singular; a
target after an id may be plural. A path closes on a noun only for how the action is performed (`/login/credential`).

## Responses and OpenAPI

`@Response(messagePath, { schema })`, `@ResponsePagination(messagePath, { schema })` (one item's schema),
`@ResponseFile()`; the argument is an i18n path. `IResponseOptions` carries `schema` and `cache` only; status
comes from `@HttpCode` or the Nest default, overridable through `metadata` on the return.

OpenAPI rides on the runtime decorators: no `*.doc.ts` factory, no bare `@ApiOperation`. `@Doc({ summary })`
emits the global error kit; endpoint-specific errors use `@DocErrors(httpStatus, ...entries)`. Kit
`DocResponseError` calls live in constants (`src/common/doc/constants/doc.constant.ts`;
`Doc<Module>ErrorResponses` in `<module>.constant.ts`); a `*Protected` decorator emits its guard's throw set
plus its security scheme, named by a module constant (`AuthJwtAccessDocSecurityName`) shared with
`src/swagger.ts`. Request shape comes from the zod schema through `standardSchemaConverter` (`src/swagger.ts:77`).
