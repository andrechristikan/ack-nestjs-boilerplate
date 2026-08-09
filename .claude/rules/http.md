# HTTP layer — controllers, guards, docs

Detail lives in `docs/authorization.md`, `docs/response.md`, `docs/doc.md`, `docs/security-and-middleware.md`. This file is the rule set.

## Decorator order (HARD — exact, never reorder)

NestJS evaluates stacked decorators bottom-up, so the HTTP method is always last in source order. Guards run in that same direction: the decorator NEAREST the method executes FIRST, the one farthest executes last. In the list below a higher number runs earlier — execution flows #16 → #1. A guard that depends on state an earlier guard sets (e.g. one needing `request.user`, which `@AuthJwtAccessProtected` populates) must sit ABOVE that guard in source, so it runs after it.

`@FeatureFlagProtected` (#12) therefore sits ABOVE `@AuthJwtAccessProtected` (#13), not below it: the flag guard reads `request.user` to apply a flag's `targetUserIds` and `rolloutPercent`, and Passport writes `request.user` inside the JWT guard. Written below the JWT guard it would run first, see `undefined`, and silently skip targeting and rollout on every route — the flag would degrade to a plain on/off switch with no signal that anything was lost.

```typescript
@ExampleDoc()                          // 1.  Swagger doc factory
@Response('example.action')            // 2.  @Response / @ResponsePaging / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3.  Term policy
@PolicyAbilityProtected({...})         // 4.  CASL policy         — admin routes
@RoleProtected(...)                    // 5.  Role                — admin routes
@ProjectMemberProtected()              // 6.  Project membership
@ProjectProtected()                    // 7.  Project exists
@WorkspaceMemberProtected(...)         // 8.  Workspace membership — pass roles to also gate by role
@WorkspaceProtected()                  // 9.  Workspace exists
@ActivityLog(...)                      // 10. Activity log
@UserProtected()                       // 11. User status
@FeatureFlagProtected(...)             // 12. Feature flag        — any route the flagged feature owns
@AuthJwtAccessProtected()              // 13. JWT (access or refresh)
@ApiKeyProtected()                     // 14. API key
@HttpCode(HttpStatus.OK)               // 15. HTTP status — only when it differs from the default
@Get('/endpoint')                      // 16. HTTP method — always last
```

Reordering is a defect even when the app still boots: the order encodes which gate rejects first — and because guards run bottom-up, the gate NEAREST the method rejects first (API key before JWT before user status before activity log before workspace before project before role before policy before term policy). A reshuffle changes which error a caller sees.

- A social-login guard (`@AuthSocialGoogleProtected()`) takes the JWT slot for that route.
- `@ActivityLog` requires `@AuthJwtAccessProtected` — it logs both success and failure against a user. Metadata is set through `RequestStoreService.merge(ActivityLogMetadataStoreKey, ...)`, never returned in the response shape, and never carries a secret. See `docs/activity-log.md`.
- `@Workspace*Protected()` / `@Project*Protected()` are composable decorators each wrapping one or two guards — stack the ones a route needs, do not assume one implies another. `@WorkspaceMemberProtected(...roles)` is ONE decorator: with no `roles` it stacks only `WorkspaceMemberGuard`; with `roles` it also stacks `WorkspaceRoleGuard` — there is no separate `@WorkspaceRoleProtected`. `WorkspaceMemberGuard`/`WorkspaceRoleGuard` read the loaded user from CLS, so the whole Workspace* family sits above `@UserProtected()`. `@Project*Protected()` sits above the whole Workspace* family — `ProjectGuard` reads the already-validated workspace from CLS to scope the project lookup (cross-workspace IDOR check). `@ProjectMemberProtected(...roles)` takes project roles the same way, but **stacks differently from its workspace twin**: with no roles it uses `ProjectMemberGuard` (a `ProjectMember` row is required), with roles it uses `ProjectRoleGuard` ALONE. It must not stack both — a workspace `owner` legitimately has no `ProjectMember` row, and the strict membership guard would reject them before the owner bypass inside `ProjectRoleGuard` could run. Never on admin routes — admin read-only endpoints use `@RoleProtected` (+ `@PolicyAbilityProtected` once a route needs it) with no workspace/project scoping at all, since admin reads across every workspace.
- Guard and protection semantics live in `docs/authorization.md`. Read it before adding a new `@<X>Protected()`.

### Admin scope carries NO workspace or project guard (HARD)

An `admin`-scope controller MUST NOT stack `@WorkspaceProtected()`, `@WorkspaceMemberProtected(...)`, `@ProjectProtected()`, `@ProjectMemberProtected()`, or any future `@Workspace*Protected` / `@Project*Protected` member. Not one of them, on any route, ever.

Admin reads and writes ACROSS every workspace — that is what the scope means. Those guards resolve their subject from the `x-workspace-id` header via CLS, so stacking one on an admin route makes a platform-wide endpoint silently depend on a client-supplied header, and a platform admin who omits the header gets rejected from data they are entitled to.

Worse, it opens an IDOR the guard cannot see: when an admin route ALSO takes a `:workspaceId` (or `:projectId`) path param, the guard validates the header value while the query reads the path value. Two sources of truth for one request — the caller passes a workspace they belong to in the header and any other workspace's id in the path.

- Admin scoping is `@RoleProtected(...)` plus `@PolicyAbilityProtected({...})`, and nothing else.
- An admin route that must be narrowed to one workspace or project takes it as an EXPLICIT `:workspaceId` / `:projectId` **path param**, validated by `RequestIsValidObjectIdPipe` — never from the header.
- The header (`x-workspace-id`) belongs to the `user` and `shared` scopes only, where `@WorkspaceProtected()` + `@WorkspaceMemberProtected()` are the correct gate and the only source of truth for the request.

### `@RoleProtected` never lists `superAdmin` (HARD)

`superAdmin` bypasses both gates unconditionally, before the required list is ever consulted:

- `RoleService.validateRoleGuard` returns `[]` and skips the `requiredRoles` check entirely for a `superAdmin`.
- `PolicyService.validatePolicyGuard` returns `true` and skips the ability check entirely for a `superAdmin`.

So `@RoleProtected(EnumRoleType.admin, EnumRoleType.superAdmin)` and `@RoleProtected(EnumRoleType.admin)` grant exactly the same access. Listing `superAdmin` adds nothing and actively misleads the next reader into believing the route is gated by an enumeration that is never reached.

Write the roles that are actually checked — for a platform admin route that is `@RoleProtected(EnumRoleType.admin)`. `superAdmin` appears in a `@RoleProtected` call only if the bypass in `RoleService` is ever removed.

### `@FeatureFlagProtected` takes the BARE key (HARD)

- **Every workspace-scoped and project-scoped route MUST carry `@FeatureFlagProtected('workspace')`** — the whole `user`, `shared`, and `public` workspace/project surface, including a route in another module that resolves its subject from the workspace header. The flag is the kill switch for that surface, so one route missing it stays live after the surface is switched off. Admin-scope routes are NOT part of it: they read across every workspace and are gated by role and policy instead.
- **The decorator argument is the bare flag key, never `key.metadataKey`.** A metadata sub-key is a service concern and is asserted inside the service method; the flag semantics, the exceptions, and the anonymous-caller rules live in `rules/feature-flag.md`.

## Controllers

- A controller is a pure HTTP → service dispatcher. One endpoint, one service method, including a trivial GET.
- **Security preconditions belong in the service, not the controller.** A 2FA check, an account-state check, or a "must own this resource" rule written inline in a controller is business logic in the wrong layer.
- **Never build pagination metadata by hand.** The repository produces it through `PaginationService`; the controller passes the return value through.
- Prefer passing the whole request DTO; normalize `undefined → null` only when a service param is `T | null` (`rules/null-safety.md`).
- One controller per scope, named for it: `<module>.<scope>.controller.ts` with `<scope>` ∈ `admin` · `public` · `user` · `system` · `shared`. The matching `src/router/routes/routes.<scope>.module.ts` registers it.
- **Every handler is `async`, without exception** — including one that only reads from the request store and returns immediately. A handler that is sync today becomes async the first time its service call grows an `await`, and that edit silently changes the method signature every caller and decorator sees. Uniformity here costs nothing and removes a whole class of diff noise.
- **A handler that returns data returns an envelope type** — `IResponseReturn<T>`, `IResponsePagingReturn<T>`, or `IResponseFileReturn`. **Never a bare DTO**: the interceptor reads `metadata` off the returned object, and a bare DTO has none.
- **A handler with nothing to return is `Promise<void>`.** Do not manufacture an envelope for it — `ResponseInterceptor` guards with `if (responseData)` and fills the message and status itself, so `return { data: undefined }` is ceremony that buys nothing. Both shapes exist in the repo (32 `void`, 13 `IResponseReturn<void>` where the SERVICE already returns the envelope); either is fine. Reach for `IResponseReturn<void>` only when the handler actually needs the `metadata` escape hatch (`httpStatus`, `statusCode`, `messagePath`, `messageProperties`) to override its own status or message.

## Route params

- Route params are camelCase and EXPLICIT: `@Get('/get/:userId')` with `@Param('userId')`. Never a bare `:id` — it goes ambiguous the moment a route nests two of them, and the ambiguity is invisible until someone reads the wrong one.
- **Three places must agree or it fails at RUNTIME with `tsc` green:** the route template, the `@Param('…')` key, and the `name` in the Swagger param constant. A mismatch between the first two makes the param silently `undefined`.
- A body field MUST NOT duplicate a path param. The path is authoritative.
### `RequestRequiredPipe` and `RequestIsValidObjectIdPipe` are a PAIR (HARD)

An ObjectId param is always validated by both, in this order:

```typescript
@Param('workspaceId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
```

Presence is checked before format. Never `RequestIsValidObjectIdPipe` on its own for an ObjectId.

**This is deliberate, and it is about the error the caller receives, not about safety.**
`RequestIsValidObjectIdPipe` does reject a falsy value on its own — but it reports it as
`RequestIsMongoIdException`, which tells the caller their value is malformed when in fact they never
sent one. `RequestRequiredPipe` first means an absent value returns `RequestParamRequiredException`
and a present-but-wrong value returns `RequestIsMongoIdException`. Two different client mistakes, two
different answers.

On a `@Param` the distinction is currently unobservable — an absent path segment does not match the
route, so the request 404s before any pipe runs. That does not make the pair decorative: it is the
same contract wherever the value is bound, it is what makes the binding safe to move to a `@Query`
later, and it states the intent for the next reader. **Do not "clean it up".**

**The pair governs REQUIRED bindings.** An OPTIONAL ObjectId — a query filter the caller may omit —
takes `new RequestIsValidObjectIdPipe({ optional: true })` alone, because `RequestRequiredPipe`
would reject the very absence the binding permits, and an absent value is no longer a client mistake
worth its own answer. An optional ObjectId query param with NO pipe is still a defect: the raw string
reaches Prisma and a malformed value returns 500 instead of 400.

```typescript
@Query('workspaceId', new RequestIsValidObjectIdPipe({ optional: true }))
workspaceId?: string
```

A param that is NOT an ObjectId (a token, a language code) takes `RequestRequiredPipe` alone — do not
invent a format validator it has no format for.

## Route path shape (HARD)

```
[/<sub-resource>]/<action>[/:<id>[/<target>[/<sub-action>]]]
```

Read left to right: WHERE it lives, WHAT is being done, to WHICH row, on WHICH part of it.

- **The action is ONE word.** `create` · `get` · `list` · `update` · `delete` · `remove` · `revoke` · `resend` · `accept` · `reject` · `assign` · `leave` · `switch` · `claim` · `preview` · `publish` · `transfer`.
- **Never fold the target into the action with a dash.** `update-role`, `update-slug`, `soft-delete`, `update-status` are wrong. What is being updated is a segment AFTER the id, because that is the only position that scales: a second attribute adds a sibling segment instead of inventing a second compound verb.
- **The id comes immediately after the action** — never `update/read/:notificationId`, always `update/:notificationId/read`.
- A dash inside a **sub-resource noun** is fine (`/mobile-number/update/:mobileNumberId`) — `rules/naming.md` allows a dash within one segment for a compound noun. The prohibition is on compound *verbs*.
- A leading scope prefix is allowed where the resource is genuinely nested (`/activity-log/user/:userId/list`). That is `<sub-resource>/:<id>` narrowing, not an attribute.
- **The sub-resource segment is SINGULAR.** `/invite/*`, `/join-request/*`, `/member/*`, `/mobile-number/*`, `/session`, `/device`, `/password-history`, `/api-key`, `/feature-flag`, `/term-policy`, `/role`, `/notification` — every one of them. A sub-resource is a NAMESPACE, not a collection: the same prefix carries `create`, `get`, `list`, and `delete`, so pluralising it makes three of the four read wrong. A plural sub-resource is a defect even when the route underneath it is a list.
- **The target segment after an id MAY be plural.** `@Get('/get/:roleId/abilities')` is correct: `abilities` names a part of the row already addressed by `:roleId`, and that part genuinely is a collection. The singular rule governs the namespace slot only — do not "fix" a target to singular.

```
GOOD  @Patch('/update/:apiKeyId/status')
GOOD  @Put('/update/:userId/password')
GOOD  @Get('/get/:roleId/abilities')                      target after an id — plural is correct
GOOD  @Delete('/member/remove/:workspaceMemberId')

BAD   @Delete('/members/remove/:workspaceMemberId')       -> /member/remove/:workspaceMemberId
BAD   @Get('/join-requests/list')                         -> /join-request/list
BAD   @Patch('/member/update-role/:workspaceMemberId')    -> /member/update/:workspaceMemberId/role
BAD   @Patch('/update-slug/:projectId')                   -> /update/:projectId/slug
BAD   @Delete('/soft-delete/:projectId')                  -> /delete/:projectId
BAD   @Post('/transfer-ownership')                        -> /ownership/transfer
BAD   @Patch('/update/read/:notificationId')              -> /update/:notificationId/read
```

## Guards

A guard is a transport gate. It reads transport inputs (JWT payload, params, reflector metadata), delegates the decision, and returns a boolean.

- **A guard MUST NOT hold a business rule.** Resolving a row and deciding by a business condition inline makes the rule untestable and invisible to every other caller. Delegate to the owning service and let it throw the typed exception.
- **Whatever a guard assigns onto `request.<field>` is a public surface** for the rest of the request — readable by every downstream controller, interceptor, logger, and error reporter. A credential must never land there.
- Guards are applied through a `@<Feature>Protected()` decorator wrapping `@UseGuards(...)`, not by bare `@UseGuards` on a controller method.

## Responses

```typescript
@Response('user.profile')            // single object → IResponseReturn<T>
@ResponsePaging('user.list')         // paginated     → IResponsePagingReturn<T>
@ResponseFile()                      // CSV / PDF     → IResponseFileReturn
```

The argument is the i18n message path, not a literal message. The handler's return type must match the decorator — a `@Response` route returning a bare DTO instead of `IResponseReturn<T>` breaks the interceptor contract. A route with nothing to return is `Promise<void>` (see "Controllers" above). See `docs/response.md`.

## Swagger docs

- Every endpoint has a matching decorator factory in `<module>/docs/<module>.<scope>.doc.ts`, composed with `applyDecorators` from the `Doc*` primitives (`Doc`, `DocAuth`, `DocGuard`, `DocRequest`, `DocRequestFile`, `DocResponse`, `DocResponsePaging`).
- `@ApiQuery` / `@ApiParam` arrays live as PascalCase constants in `<module>/constants/<module>.doc.constant.ts` (`UserDocParamsMobileNumberId`) and are referenced by the doc function. **Never an inline array literal inside the doc call**, and never generated from the request DTO.
- The doc file mirrors the controller: one exported factory per endpoint, named `<Module><Scope><Action>Doc`.
- Doc factories follow `rules/authoring.md` for comments — no method JSDoc required.
