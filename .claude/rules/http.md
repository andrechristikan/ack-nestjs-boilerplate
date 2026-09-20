# HTTP layer — controllers, guards, docs

This file is the rule set. Flow narrative lives in `docs/authorization.md`,
`docs/response.md`, `docs/doc.md`, `docs/security-and-middleware.md`,
`docs/activity-log.md` — explorer or planner opens the named file when the behaviour is
not settled here. No other agent reads those docs as a standing step.

## Decorator order (HARD — exact, never reorder)

NestJS evaluates stacked decorators bottom-up, so the HTTP method is always last in source order. Guards run in that same direction: the decorator NEAREST the method executes FIRST, the one farthest executes last. In the list below a higher number runs earlier — execution flows #15 → #1. A guard that depends on state an earlier guard sets (e.g. one needing `request.user`, which `@AuthJwtAccessProtected` populates) must sit ABOVE that guard in source, so it runs after it.

`@FeatureFlagProtected` (#11) therefore sits ABOVE `@AuthJwtAccessProtected` (#12), not below it: the flag guard reads `request.user` to apply a flag's `targetUserIds` and `rolloutPercent`, and Passport writes `request.user` inside the JWT guard. Written below the JWT guard it would run first, see `undefined`, and silently skip targeting and rollout on every route — the flag would degrade to a plain on/off switch with no signal that anything was lost.

```typescript
@Doc({ summary: '…' })                 // 1.  OpenAPI operation + global error kit
@Response('example.action')            // 2.  @Response / @ResponsePagination / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3.  Term policy
@PolicyProtected({...})                // 4.  CASL policy         — admin routes
@RoleProtected(...)                    // 5.  Role                — admin routes
@ProjectMemberProtected()              // 6.  Project membership
@ProjectProtected()                    // 7.  Project exists
@WorkspaceMemberProtected(...)         // 8.  Workspace membership — pass roles to also gate by role
@WorkspaceProtected()                  // 9.  Workspace exists
@UserProtected()                       // 10. User status
@FeatureFlagProtected(...)             // 11. Feature flag        — any route the flagged feature owns
@AuthJwtAccessProtected()              // 12. JWT (access or refresh)
@ApiKeyProtected()                     // 13. API key
@HttpCode(HttpStatus.OK)               // 14. HTTP status — only when it differs from the default
@Get('/endpoint')                      // 15. HTTP method — always last
```

Reordering is a defect even when the app still boots: the order encodes which gate rejects first — and because guards run bottom-up, the gate NEAREST the method rejects first (API key before JWT before user status before workspace before project before role before policy before term policy). A reshuffle changes which error a caller sees.

- **`@HttpCode` belongs ONLY on `@Post`.** Nest defaults POST to `201 Created` and every other method to `200 OK`, so `@HttpCode(HttpStatus.OK)` above a `@Get` / `@Put` / `@Patch` / `@Delete` is a no-op that reads as if the route were doing something unusual. Delete it — and delete the `HttpCode` / `HttpStatus` imports when the file has no `@Post` left that needs them.
- **`@RequestThrottle({...})` sits OUTSIDE this order.** It mounts an interceptor, not a guard, and interceptors run after every guard regardless of declaration order or class-versus-method placement. Place it consistently and move on — no position silently degrades it.
- A social-login guard (`@AuthSocialGoogleProtected()`) takes the JWT slot for that route.
- **Activity is not a decorator.** A domain prepares an event with `ActivityLogDomain.prepare(...)` before the write and stages it with `stagePrepared(...)` after, and the global `ActivityLogInterceptor` flushes it; metadata is validated by the action's contract, returned through a typed response schema, and never carries a secret (`rules/security.md`).
- `@Workspace*Protected()` / `@Project*Protected()` are composable decorators each wrapping one or two guards — stack the ones a route needs, do not assume one implies another. `@WorkspaceMemberProtected(...roles)` is ONE decorator: with no `roles` it stacks only `WorkspaceMemberGuard`; with `roles` it also stacks `WorkspaceRoleGuard` — there is no separate `@WorkspaceRoleProtected`. `WorkspaceMemberGuard`/`WorkspaceRoleGuard` read the loaded user from CLS, so the whole Workspace* family sits above `@UserProtected()`. `@Project*Protected()` sits above the whole Workspace* family — `ProjectGuard` reads the already-validated workspace from CLS to scope the project lookup (cross-workspace IDOR check). `@ProjectMemberProtected(...roles)` takes project roles the same way, but **stacks differently from its workspace twin**: with no roles it uses `ProjectMemberGuard` (a `ProjectMember` row is required), with roles it uses `ProjectRoleGuard` ALONE. `@ProjectMemberCurrent()` therefore belongs only on the role-less form: the role form stores no member row, and the decorator answers 500 when it finds none (`rules/security.md`). It must not stack both — a workspace `owner` legitimately has no `ProjectMember` row, and the strict membership guard would reject them before the owner bypass inside `ProjectRoleGuard` could run. Never on admin routes — admin read-only endpoints use `@RoleProtected` (+ `@PolicyProtected` once a route needs it) with no workspace/project scoping at all, since admin reads across every workspace.
- A new `@<X>Protected()` follows the stack in this file. Flow narrative for the existing
  guards: `docs/authorization.md` — explorer or planner.

### Admin scope carries NO workspace or project guard (HARD)

An `admin`-scope controller MUST NOT stack `@WorkspaceProtected()`, `@WorkspaceMemberProtected(...)`, `@ProjectProtected()`, `@ProjectMemberProtected()`, or any future `@Workspace*Protected` / `@Project*Protected` member. Not one of them, on any route, ever.

Admin reads and writes ACROSS every workspace — that is what the scope means. Those guards resolve their subject from the `x-workspace-id` header via CLS, so stacking one on an admin route makes a platform-wide endpoint silently depend on a client-supplied header, and a platform admin who omits the header gets rejected from data they are entitled to.

Worse, it opens an IDOR the guard cannot see: when an admin route ALSO takes a `:workspaceId` (or `:projectId`) path param, the guard validates the header value while the query reads the path value. Two sources of truth for one request — the caller passes a workspace they belong to in the header and any other workspace's id in the path.

- Admin scoping is `@RoleProtected(...)` plus `@PolicyProtected({...})`, and nothing else.
- An admin route that must be narrowed to one workspace or project takes it as an EXPLICIT `:workspaceId` / `:projectId` **path param**, validated with `{ schema: RequestMongoIdSchema }` — never from the header.
- The header (`x-workspace-id`) belongs to the `user` and `shared` scopes only, where `@WorkspaceProtected()` + `@WorkspaceMemberProtected()` are the correct gate and the only source of truth for the request.

### `@RoleProtected` never lists `superAdmin` (HARD)

`superAdmin` bypasses both gates unconditionally, before the required list is ever consulted:

- `RoleDomain.validateRoleGuard` returns `[]` and skips the `requiredRoles` check entirely for a `superAdmin`.
- `PolicyDomain.validatePolicyGuard` returns `true` and skips the ability check entirely for a `superAdmin`.

So `@RoleProtected(EnumRoleType.admin, EnumRoleType.superAdmin)` and `@RoleProtected(EnumRoleType.admin)` grant exactly the same access. Listing `superAdmin` adds nothing and actively misleads the next reader into believing the route is gated by an enumeration that is never reached.

Write the roles that are actually checked — for a platform admin route that is `@RoleProtected(EnumRoleType.admin)`. `superAdmin` appears in a `@RoleProtected` call only if the bypass in `RoleDomain` is ever removed.

### `@FeatureFlagProtected` takes the BARE key (HARD)

- **Every workspace-scoped and project-scoped route MUST carry `@FeatureFlagProtected('workspace')`** — the whole `user`, `shared`, and `public` workspace/project surface, including a route in another module that resolves its subject from the workspace header. The flag is the kill switch for that surface, so one route missing it stays live after the surface is switched off. Admin-scope routes are NOT part of it: they read across every workspace and are gated by role and policy instead.
- **The decorator argument is the bare flag key, never `key.metadataKey`.** A metadata sub-key is a domain concern and is asserted inside the domain method; the flag semantics, the exceptions, and the anonymous-caller rules live in `rules/feature-flag.md`.

## Controllers

- A controller is a pure HTTP → HTTP-service dispatcher. One endpoint, one `<Module>HttpService` method, including a trivial GET. It never reaches the domain (`rules/architecture.md`).
- **Security preconditions belong in the domain, not the controller and not the HTTP service.** A 2FA check, an account-state check, or a "must own this resource" rule written inline in a controller is business logic in the wrong layer; written in the HTTP service it is a rule the queue path never applies.
- **Never build pagination metadata by hand.** The repository produces it through `PaginationService`; the HTTP service wraps it in the response envelope and the controller passes that through.
- Prefer passing the whole request DTO; normalize `undefined → null` only when a service param is `T | null` (`rules/null-safety.md`).
- **One controller per scope**, named for it: `<module>.<scope>.controller.ts` with `<scope>` ∈ `admin` · `public` · `user` · `system` · `shared`. The matching `src/router/http/router.http.<scope>.module.ts` registers it. A scope with many endpoints stays one file; the concerns separate in the HTTP services and the doc factories behind it, not in a second controller.
- **`@RequestThrottle` is a METHOD decorator. Class-level use does not compile (HARD).** It returns `MethodDecorator`, so putting it above a `@Controller` fails with `TS1238` / `TS1270`. It is declared per endpoint so the rate limit is read where the route is, next to the guards that protect it — a class-level throttle would silently govern every handler the controller ever grows, including ones added years later by someone who never saw it.
- **Every JWT-protected handler carries `@RequestThrottle({ user: true })` (HARD).** `@AuthJwtAccessProtected()` or `@AuthJwtRefreshProtected()` on a handler with no `RequestThrottle` beside it is a defect. `public` and `system` scopes carry no `req.user`, so the switch is a silent no-op there and must NOT be added. **A handler that omits it keeps only the global per-IP limit: nothing fails, nothing logs, no test catches it** — this rule is the only thing standing between a new endpoint and a lost per-user limit.
- **One `@RequestThrottle` per handler, never two.** A sensitive endpoint takes its tier in the SAME call — `@RequestThrottle({ user: true, route: EnumRequestThrottleRoute.<tier> })`. Two calls on one handler make the second `SetMetadata` overwrite the first and drop a switch, with nothing failing. Every limit value lives in `request.config.ts`; a decorator never carries a number.
- **Every handler is `async`, without exception** — including one that only reads from the request store and returns immediately. A handler that is sync today becomes async the first time its service call grows an `await`, and that edit silently changes the method signature every caller and decorator sees. Uniformity here costs nothing and removes a whole class of diff noise.
- **A handler that returns data returns an envelope type** — `IResponseReturn<T>`, `IResponsePaginationReturn<T>`, or `IResponseFileReturn`. **Never a bare DTO**: the interceptor reads `metadata` off the returned object, and a bare DTO has none.
- **A handler with nothing to return is `Promise<void>`.** Do not manufacture an envelope for it — `ResponseInterceptor` guards with `if (responseData)` and fills the message and status itself, so `return { data: undefined }` is ceremony that buys nothing. Both shapes exist in the repo (32 `void`, 13 `IResponseReturn<void>` where the SERVICE already returns the envelope); either is fine. Reach for `IResponseReturn<void>` only when the handler actually needs the `metadata` escape hatch (`httpStatus`, `statusCode`, `messagePath`, `messageProperties`) to override its own status or message.

## Route params

- Route params are camelCase and EXPLICIT: `@Get('/get/:userId')` with `@Param('userId')`. Never a bare `:id` — it goes ambiguous the moment a route nests two of them, and the ambiguity is invisible until someone reads the wrong one.
- **The route template and the `@Param('…')` key must agree or it fails at RUNTIME with `tsc` green** — a mismatch makes the param silently `undefined`. Where a Swagger param constant documents a placeholder no handler binds, its `name` is the third place that must agree.
- A body field MUST NOT duplicate a path param. The path is authoritative.
### Path and query params bind a zod schema (HARD)

A path or query value is validated by the same `RequestSchemaValidationPipe` as a body. Bind the
schema on the decorator; do not add a custom pipe for ObjectId or presence checks.

```typescript
@Param('workspaceId', { schema: RequestMongoIdSchema })
workspaceId: string

@Query('workspaceId', { schema: RequestMongoIdSchema.optional() })
workspaceId?: string

@Param('inviteToken', { schema: RequestRequiredStringSchema })
inviteToken: string
```

- **Required ObjectId** — `RequestMongoIdSchema` (`src/common/request/validations/request.mongo-id.validation.ts`).
- **Optional ObjectId query** — `RequestMongoIdSchema.optional()`. An optional ObjectId with no
  schema is a defect: the raw string reaches Prisma and a malformed value returns 500 instead of
  400.
- **Required non-ObjectId string** (token, slug) — `RequestRequiredStringSchema`.
- **Language code** — `RequestMessageLanguageSchema` where that is the contract.
- Shared schemas live under `src/common/request/validations/`. Module-specific ones live under
  `<module>/validations/` (`rules/validation.md`).
- File upload presence stays on `FileRequiredPipe()` and the other file pipes (`rules/file.md`).

## Route path shape (HARD)

There are TWO grammars. **Which one applies is decided by WHERE the noun comes from, not by what it means:**

- Everything in the controller's `path:` is the controller's OWN resource, however many segments and scope ids it carries. `path: '/user/:userId/session'` makes `session` the own resource.
- Any noun introduced by the ROUTE DECORATOR opens a sub-resource namespace. `@Delete('/mobile-number/…')` inside `path: '/user'` makes `mobile-number` a sub-resource.

That line is mechanical on purpose. "Is a session really a sub-resource of a user?" has no stable answer; "which file wrote the segment" has exactly one.

**The controller's own resource** — action first, id after it:

```
/<action>[/:<id>[/<target>]]
```

**A sub-resource namespace** (`member`, `invite`, `join-request`, `mobile-number`, `2fa`, `content`, …) — id first, action LAST:

```
/<sub-resource>/:<id>[/<target>]/<action>
/<sub-resource>[/<target>]/<action>                      when the action addresses no single row (list, create)
/<sub-resource>/:<scope-id>[/:<id>][/<target>]/<action>  when a parent row narrows the whole namespace
```

The second grammar closes on the action because the action is the only segment that never narrows: everything before it is addressing, so putting it anywhere but last splits the address in two.

- **The action is ONE word, and it is a VERB.** `accept` · `add` · `assign` · `change` · `check` · `claim` · `create` · `delete` · `disable` · `enable` · `export` · `forgot` · `generate` · `get` · `import` · `leave` · `list` · `login` · `logout` · `preview` · `publish` · `refresh` · `regenerate` · `reject` · `remove` · `resend` · `reset` · `revoke` · `revoke-all` · `send` · `setup` · `sign-up` · `switch` · `transfer` · `update` · `upload` · `verify`. Extend this list when a genuinely new verb is needed — a path whose last segment is a NOUN is usually the defect, not a missing entry. The two exceptions are named below: health probes, and an action qualified by HOW it is performed.
- **`<verb>-all` is one action: `<verb>` applied to every row the path addresses.** It is allowed only when `<verb>` is on the list above and the path carries no row id — `@Delete('/revoke-all')` beside `@Delete('/revoke/:sessionId')`. It is a scope on the verb, not a target folded into it, so `read-all` stays wrong: `read` is the target of `update`, and the path is `/update/:notificationId/read`.
- **Health probes are exempt.** `/health/aws`, `/health/database`, `/health/instance` are noun-only by convention and carry no action. Do not "fix" them.
- **Never fold the target into the action with a dash.** `update-role`, `update-slug`, `soft-delete`, `update-status`, `read-all`, `change-password`, `generate-presign`, `regenerate-backup-codes` are wrong. The target is its own segment, because that is the only position that scales: a second attribute adds a sibling segment instead of inventing a second compound verb. A dash inside a single lexical word is NOT that: `sign-up` is one verb, and it is the kebab spelling of the `signUp` used everywhere in code — the same mapping as `mobile-number` ↔ `mobileNumber`. Never collapse it to `signup`; that breaks the mapping the whole repo relies on.
- **An action MAY end on a noun when that noun names HOW the action is performed, not WHAT it acts on.** `/login/credential`, `/login/social/google` — the trailing segment is the credential type, and the flow's own sub-steps nest under the same namespace (`/login/2fa/verify`). This is the only place a path may close on a noun. It does NOT license `/list/user-setting`, where the trailing noun is a different resource being listed.
- **ONE verb per path.** `/update/:termPolicyId/content/update` and `/update/:apiKeyId/reset` carry two. The first verb is always the wrong one — it is a namespace pretending to be an action. Drop it and let the real noun open the path: `/content/:termPolicyId/update`, `/reset/:apiKeyId`.
- **The HTTP method and the action agree.** A `@Post` whose action is `get`, or a `@Delete` whose action is `update`, is a defect in one of the two — decide which and fix it.
- **Own resource: the id comes immediately after the action** — never `update/read/:notificationId`, always `update/:notificationId/read`.
- **Sub-resource: the id comes immediately after the namespace, and the action closes the path** — `/join-request/:workspaceJoinRequestId/reject`, `/member/:workspaceMemberId/role/update`.
- **The namespace ALWAYS leads — never a bare `:id`.** A scope id that narrows the whole namespace goes INSIDE it, immediately after the noun and before the row id: `/member/:projectId/:projectMemberId/remove`, not `/:projectId/member/:projectMemberId/remove`. Ids read left to right as scope then row, and the action still closes the path.
- A dash inside a **sub-resource noun** is fine (`/mobile-number/:mobileNumberId/update`) — `rules/naming.md` allows a dash within one segment for a compound noun. The prohibition is on compound *verbs*.
- **EVERY resource noun segment is SINGULAR** — in the controller's `path:` (`/api-key`, `/feature-flag`, `/term-policy`, `/session`, `/device`, `/role`, `/notification`) and in a route's sub-resource slot (`/invite/*`, `/join-request/*`, `/member/*`, `/mobile-number/*`, `/content/*`, `/setting/*`) alike. A resource noun is a NAMESPACE, not a collection: the same prefix carries `create`, `get`, `list`, and `delete`, so pluralising it makes three of the four read wrong. A plural noun is a defect even when the route underneath it is a list.
- **The target segment after an id MAY be plural.** `@Get('/get/:roleId/abilities')` is correct: `abilities` names a part of the row already addressed by `:roleId`, and that part genuinely is a collection. The singular rule governs the namespace slot only — do not "fix" a target to singular.

```
GOOD  @Patch('/update/:apiKeyId/status')                      own resource
GOOD  @Put('/update/:userId/password')                        own resource
GOOD  @Get('/get/:roleId/abilities')                          target after an id — plural is correct
GOOD  @Delete('/member/:workspaceMemberId/remove')            sub-resource
GOOD  @Patch('/member/:workspaceMemberId/role/update')        sub-resource with a target
GOOD  @Post('/join-request/:workspaceJoinRequestId/reject')   sub-resource
GOOD  @Get('/join-request/list')                              sub-resource, addresses no row
GOOD  @Get('/user/:userId/list')                              sub-resource, addresses a parent row
GOOD  @Delete('/member/:projectId/:projectMemberId/remove')   scope id, then row id, then the action
GOOD  @Delete('/revoke/:sessionId')                           own resource — the controller mounts at
                                                              path: '/user/:userId/session', so `session`
                                                              is ITS resource and the action leads
GOOD  @Delete('/revoke-all')                                  own resource, every row — `<verb>-all`
GOOD  @Post('/login/credential')                              action qualified by HOW — see the noun rule
GOOD  @Post('/sign-up')                                       one lexical verb, kebab of `signUp`

BAD   @Delete('/member/remove/:workspaceMemberId')            -> /member/:workspaceMemberId/remove
BAD   @Get('/:projectId/member/list')                         -> /member/:projectId/list
BAD   @Post('/join-request/reject/:workspaceJoinRequestId')   -> /join-request/:workspaceJoinRequestId/reject
BAD   @Delete('/members/remove/:workspaceMemberId')           -> /member/:workspaceMemberId/remove
BAD   @Get('/join-requests/list')                             -> /join-request/list
BAD   @Patch('/member/update-role/:workspaceMemberId')        -> /member/:workspaceMemberId/role/update
BAD   @Patch('/update-slug/:projectId')                       -> /update/:projectId/slug
BAD   @Delete('/soft-delete/:projectId')                      -> /delete/:projectId
BAD   @Get('/:projectId/get')                                 -> /get/:projectId
BAD   @Post('/transfer-ownership')                            -> /ownership/transfer
BAD   @Patch('/update/read/:notificationId')                  -> /update/:notificationId/read
BAD   @Put('/mobile-number/update/:mobileNumberId')           -> /mobile-number/:mobileNumberId/update
BAD   @Put('/update/:termPolicyId/content/update')            -> /content/:termPolicyId/update      two verbs
BAD   @Patch('/update/:userId/2fa/reset')                     -> /2fa/:userId/reset                 two verbs
BAD   @Patch('/change-password')                              -> /password/change                   dash verb
BAD   @Post('/2fa/regenerate-backup-codes')                   -> /2fa/backup-code/regenerate        dash verb
BAD   @Get('/profile')                                        -> /profile/get                       no action
BAD   @Get('/list/user-setting')                              -> /setting/list                      noun last
BAD   @Post('/check/username')                                -> /username/check                    noun last
BAD   @Post('/get/:termPolicyId/content/:language')           -> @Get('/content/:termPolicyId/:language/get')
```

## Custom request headers (HARD)

A new `x-*` request header is not live until it is registered. Adding the middleware, the config entry, and the guard that reads it is only half the job.

- **Register the name in `request.config.ts` → `cors.allowedHeader`.** Without it the browser preflight rejects the header, the request never reaches Nest, and the feature is dead from every browser client while still working from curl and Postman. `tsc`, lint, and Vitest all stay green — nothing but a real cross-origin request catches this.
- **The header name lives in a config file, never as a literal in the middleware or guard** (`x-workspace-id` → `workspace.headerName`, `x-anonymous-id` → `featureFlag.anonymous.headerName`). The CORS entry is the one place the raw string is repeated, because `cors.allowedHeader` is a flat transport allow-list.
- **A header the server READS must be in `allowedHeader`; a header the server SETS and the client must read needs `exposedHeaders` instead.** They are different lists solving different halves of CORS.

## Guards

A guard is a transport gate. It reads transport inputs (JWT payload, params, reflector metadata), delegates the decision, and returns a boolean.

- **A guard MUST NOT hold a business rule.** Resolving a row and deciding by a business condition inline makes the rule untestable and invisible to every other caller. Delegate to the owning service and let it throw the typed exception.
- **Whatever a guard assigns onto `request.<field>` is a public surface** for the rest of the request — readable by every downstream controller, interceptor, logger, and error reporter. A credential must never land there.
- Guards are applied through a `@<Feature>Protected()` decorator wrapping `@UseGuards(...)`, not by bare `@UseGuards` on a controller method.

## Responses

```typescript
@Response('user.profile')                 // single object → IResponseReturn<T>
@ResponsePagination('user.list', {        // paginated     → IResponsePaginationReturn<T>
    schema: UserListResponseSchema,
})
@ResponseFile()                           // CSV / PDF     → IResponseFileReturn
```

The argument is the i18n message path, not a literal message. The handler's return type must match the decorator — a `@Response` route returning a bare DTO instead of `IResponseReturn<T>` breaks the interceptor contract. A route with nothing to return is `Promise<void>` (see "Controllers" above).

`@Response` / `@ResponsePagination` / `@ResponseFile` also emit their OpenAPI success envelope and the error kits that belong to that response kind (`rules/dto.md`). `@Response` / `@ResponseFile` take success HTTP status **and** body `statusCode` from `@HttpCode` when present, otherwise Nest method defaults (`POST` → 201, else 200). `IResponseOptions` carries only `schema` and `cache` — not `httpStatus` or `statusCode`. Override either status at runtime via `metadata` on the handler return. `@ResponsePagination` documents 200 and passes `baseSchema: ResponsePaginationSchema` on its success entry. It does **not** emit list `ApiQuery`s; those come from the zod query schema (`rules/pagination.md`). The interceptor reads pagination strategy from the handler return via `EnumPaginationType`.

**A `*.decorator.ts` file has no file-local helper functions.** Status resolution, cache option
wiring, and OpenAPI entry mapping live **inside** the exported decorator factory — not in a
sibling `function resolve…` / `function apply…` in the same file.

## OpenAPI — co-located on the runtime stack

OpenAPI rides on the same decorators that own the HTTP contract. There is no module
`<module>/docs/*.doc.ts` factory and no dual stack of `DocAuth` / `DocGuard` / `DocRequest` /
`DocResponse*` beside the controller. A bare `@ApiOperation` / `@ApiResponse` bypasses the
shared shape.

Every endpoint carries `@Doc({ summary })` at the top of the stack (operation metadata,
language/correlation headers, **global** error kit). Endpoint-specific module-flow errors that
must appear in OpenAPI use the public escape hatch `@DocErrors(httpStatus, ...entries)`.
Controllers do not call `DocResponseError` directly — use `@DocErrors` for endpoint-specific
module-flow errors.

**`DocResponseError` is the internal kit emitter** for responses of one status: each entry a
`statusCode` plus its i18n `messagePath` (and optional `schema` for `data`, optional
`baseSchema` defaulting to `ResponseSchema` — paginated success uses
`ResponsePaginationSchema`). One entry at a status emits a plain schema with field examples.
Two or more emit one shared base schema plus named OpenAPI `examples` keyed by `messagePath`.
It is a `MethodDecorator` that merges entries onto the handler under
`DocResponseEntryMetaKey` and re-emits `ApiResponse` for that status, so entries from different
primitives at one status compose instead of replacing each other. Dedupe key:
`httpStatus:statusCode:messagePath`.

**One error has one source**, from where the exception LIVES:

| The exception lives in | Its entry belongs to |
|---|---|
| `src/common/` or `src/app/`, and any request can reach it | `@Doc()` — every endpoint |
| `src/common/`, behind one runtime primitive | that primitive: pagination kits on `@ResponsePagination`, upload kits on `FileUpload*`, download kits on `@ResponseFile` |
| a module, raised by a guard or an auth strategy | the matching `*Protected` / auth decorator |
| a module, raised by a specific endpoint's flow and required in OpenAPI | `@DocErrors` on that handler |

Kit errors are declared once, in the primitive, for everyone it decorates — a paginated route
publishes the whole pagination error set (offset **and** cursor kits) whether or not a given
request could trip each member. That breadth is the contract of a shared primitive.

**`auth.error.accessTokenUnauthorized` belongs to `AuthJwtAccessProtected`.** A Protected
decorator whose domain also throws `AuthJwtAccessTokenInvalidException` when the principal is
missing does not publish that 401 again — never on `UserProtected`.

**Each `*Protected` / auth decorator emits exactly the throw set of the guard class it
installs**, plus any security scheme (`ApiBearerAuth`, `ApiSecurity`). Where a decorator
installs a DIFFERENT guard class depending on its arguments, each class takes its own kit:
two kits that are mutually exclusive by construction are honest; one kit covering both is not.
A guard used by a handful of endpoints and not worth a kit leaves its throws off the OpenAPI
document unless an endpoint opts in with `@DocErrors`.

### OpenAPI security scheme names (HARD)

OpenAPI scheme names are **module constants**, never magic strings at `ApiBearerAuth`,
`ApiSecurity`, `DocumentBuilder.addBearerAuth`, or `DocumentBuilder.addApiKey`.

- **Scheme VALUES are camelCase:** `'accessToken'`, `'refreshToken'`, `'google'`, `'apple'`,
  `'xApiKey'`.
- **Const identifiers are PascalCase** on the owning module's constant file, parallel to
  `AuthJwtAccessGuardKey`: `AuthJwtAccessDocSecurityName`, `AuthJwtRefreshDocSecurityName`,
  `AuthSocialGoogleDocSecurityName`, `AuthSocialAppleDocSecurityName`, `ApiKeyDocSecurityName`
  (`rules/naming.md`).
- Registration in `src/swagger.ts` and emission on `*Protected` / auth decorators both import
  those consts. The header name `'x-api-key'` is the apiKey `in: 'header'` transport name and is
  not this rule's subject.

**Kit `DocResponseError` calls live in constants — not inline in `*.decorator.ts`.**
Common kits (`DocGlobalErrorResponses`, `DocPaginationErrorResponses`, `DocFileErrorResponses`,
…) live in `src/common/doc/constants/doc.constant.ts` and are consumed by `@Doc`,
`@Response*`, and `FileUpload*`. Module `*Protected` / auth kits live as `Doc<Module>ErrorResponses`
in that module's `constants/<module>.constant.ts` and are spread into the decorator's
`applyDecorators(...)`. Each entry is a `DocResponseError(...)` MethodDecorator — never a
pre-composed `applyDecorators` blob.

### Who documents request shape

| Binding | OpenAPI source |
|---|---|
| `@Param('…', { schema })` / `@Query({ schema })` / `@Query('…', { schema })` / `@Body({ schema })` | zod via `standardSchemaConverter` in `src/swagger.ts` (`.meta` for description, example, required) |
| Path placeholder a **guard** reads; the handler has no `@Param` | the owning Protected decorator — e.g. `ProjectProtected` emits `ApiParam('projectId')`. No unused `@Param` on the handler. |
| Multipart upload | `FileUploadSingle` / `FileUploadMultiple` / `FileUploadMultipleFields` — `ApiConsumes('multipart/form-data')` + binary `ApiBody` from field name(s) + upload error kit (`rules/file.md`) |
| List query (page/cursor/`perPage`/`search`/`orderBy` + filters) | the list zod schema on `@Query({ schema })` from kit factories + `.extend` (`rules/pagination.md`) |

A hand-written schema object beside a zod schema is a mirror. Every field carries
`.meta({ description, example })` on the zod schema. Do not call `faker.seed()`.

Controller-facing Doc surface that exists: `@Doc`, `@DocErrors`. Everything else is absorbed
into runtime decorators or is internal kit plumbing under `src/common/doc/`.

Flow narrative: `docs/doc.md` — explorer or planner opens it when the annotation question is
not settled by this section.
