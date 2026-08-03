# HTTP layer — controllers, guards, docs

Detail lives in `docs/authorization.md`, `docs/response.md`, `docs/doc.md`, `docs/security-and-middleware.md`. This file is the rule set.

## Decorator order (HARD — exact, never reorder)

NestJS evaluates stacked decorators bottom-up, so the HTTP method is always last in source order. Guards run in that same direction: the decorator NEAREST the method executes FIRST, the one farthest executes last. In the list below a higher number runs earlier — execution flows #10 → #1. A guard that depends on state an earlier guard sets (e.g. one needing `request.user`, which `@AuthJwtAccessProtected` populates) must sit ABOVE that guard in source, so it runs after it.

```typescript
@ExampleDoc()                          // 1.  Swagger doc factory
@Response('example.action')            // 2.  @Response / @ResponsePaging / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3.  Term policy
@PolicyAbilityProtected({...})         // 4.  CASL policy
@RoleProtected(...)                    // 5.  Role
@ActivityLog(...)                      // 6.  Activity log
@UserProtected()                       // 7.  User status
@AuthJwtAccessProtected()              // 8.  JWT (access or refresh)
@FeatureFlagProtected(...)             // 9.  Feature flag
@ApiKeyProtected()                     // 10. API key
@HttpCode(HttpStatus.OK)               // 11. HTTP status — only when it differs from the default
@Get('/endpoint')                      // 12. HTTP method — always last
```

Reordering is a defect even when the app still boots: the order encodes which gate rejects first — and because guards run bottom-up, the gate NEAREST the method rejects first (API key before JWT before role before policy before term policy). A reshuffle changes which error a caller sees.

- A social-login guard (`@AuthSocialGoogleProtected()`) takes the JWT slot for that route.
- `@ActivityLog` requires `@AuthJwtAccessProtected` — it logs both success and failure against a user. Metadata is set through `RequestStoreService.merge(ActivityLogMetadataStoreKey, ...)`, never returned in the response shape, and never carries a secret. See `docs/activity-log.md`.
- Guard and protection semantics live in `docs/authorization.md`. Read it before adding a new `@<X>Protected()`.

## Controllers

- A controller is a pure HTTP → service dispatcher. One endpoint, one service method, including a trivial GET.
- **Security preconditions belong in the service, not the controller.** A 2FA check, an account-state check, or a "must own this resource" rule written inline in a controller is business logic in the wrong layer.
- **Never build pagination metadata by hand.** The repository produces it through `PaginationService`; the controller passes the return value through.
- Prefer passing the whole request DTO; normalize `undefined → null` only when a service param is `T | null` (`rules/null-safety.md`).
- One controller per scope, named for it: `<module>.<scope>.controller.ts` with `<scope>` ∈ `admin` · `public` · `user` · `system` · `shared`. The matching `src/router/routes/routes.<scope>.module.ts` registers it.

## Route params

- Route params are camelCase and EXPLICIT: `@Get('/get/:userId')` with `@Param('userId')`. Never a bare `:id` — it goes ambiguous the moment a route nests two of them, and the ambiguity is invisible until someone reads the wrong one.
- **Three places must agree or it fails at RUNTIME with `tsc` green:** the route template, the `@Param('…')` key, and the `name` in the Swagger param constant. A mismatch between the first two makes the param silently `undefined`.
- A body field MUST NOT duplicate a path param. The path is authoritative.

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

The argument is the i18n message path, not a literal message. The handler's return type must match the decorator — a `@Response` route returning a bare DTO instead of `IResponseReturn<T>` breaks the interceptor contract. See `docs/response.md`.

## Swagger docs

- Every endpoint has a matching decorator factory in `<module>/docs/<module>.<scope>.doc.ts`, composed with `applyDecorators` from the `Doc*` primitives (`Doc`, `DocAuth`, `DocGuard`, `DocRequest`, `DocRequestFile`, `DocResponse`, `DocResponsePaging`).
- `@ApiQuery` / `@ApiParam` arrays live as PascalCase constants in `<module>/constants/<module>.doc.constant.ts` (`UserDocParamsMobileNumberId`) and are referenced by the doc function. **Never an inline array literal inside the doc call**, and never generated from the request DTO.
- The doc file mirrors the controller: one exported factory per endpoint, named `<Module><Scope><Action>Doc`.
- Doc factories follow `rules/authoring.md` for comments — no method JSDoc required.
