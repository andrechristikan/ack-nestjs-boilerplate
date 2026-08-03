# GitHub Copilot Instructions

Inline code-suggestion rules for **ack-nestjs-boilerplate**. Self-contained: everything needed to complete code that fits this repo. Keep suggestions short and idiomatic; when unsure, match the surrounding file.

**Stack:** NestJS 11 · TypeScript strict · Prisma → MongoDB (replica set) · Redis (cache `db:0`, BullMQ `db:1`) · PNPM only · Node >= 24.11 · JWT ES256/ES512 · class-validator + class-transformer · nestjs-i18n · Pino.

---

## Layering — repository pattern

```
Controller ──▶ Service ──▶ Repository ──▶ DatabaseService (Prisma)
```

- **Controller** — routing only. One endpoint, one service method. Normalizes `undefined → null` before calling the service.
- **Service** — business logic only. Injects repositories and other services as classes. **Never injects `DatabaseService`.**
- **Repository** — data access only. Injects `DatabaseService` directly. Owns `null → {}` filter normalization before Prisma. No business rules, no i18n message paths.

Feature modules use flat folder-per-concern directories. Take only what the feature needs:

```
constants/ controllers/ decorators/ docs/ dtos/{request,response}/ enums/ exceptions/
factories/ guards/ indicators/ interceptors/ interfaces/ processors/ repositories/
services/ templates/ utils/ validations/
```

**No header interfaces.** Do not generate an `I<Xxx>Service` beside a service class — services are injected by their concrete class, so an interface with no consumer is dead weight that drifts silently. An interface here describes DATA (`IUser`, `IRequestLog`, `INotificationSendPushPayload`) or is a framework contract the framework itself consumes (`OnModuleInit`, `NestMiddleware`, `PipeTransform`, `CanActivate`, `ExceptionFilter`).

---

## Naming

**Files:** `<module>.<noun-or-action>[.<sub>].<role>.ts`. Every file starts with the module prefix. A dot separates segments; a dash appears only inside one segment (`user.mobile-number.dto.ts`). Folders are kebab-case.

Role suffixes: `.service .repository .controller .guard .strategy .decorator .interceptor .filter .middleware .pipe .processor .indicator .factory .validation .util .dto .doc .module .enum .constant .interface .exception`

| Kind | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserService`, `UserAdminController` |
| Interface / type | `I` + PascalCase | `IUser`, `IPaginationQuery` |
| Enum type | `Enum` + PascalCase | `EnumQueue`, `EnumPolicyAction` |
| Enum key AND value | camelCase | `notFound`, `notificationEmail` |
| Constant | PascalCase — objects, arrays, primitives alike | `AuthJwtAccessGuardKey` |
| Method / variable / field | camelCase | `findById`, `perPage` |
| Request DTO | `<Module>...RequestDto` | `UserCreateRequestDto` |
| Response DTO | `<Module>...ResponseDto` | `UserProfileResponseDto` |
| Payload interface | `I<Module><Action>Payload` — kind word LAST | `INotificationSendPushPayload` |
| BullMQ job payload | `I<Module><Action>QueuePayload` — kind is `Queue`, LAST | `INotificationEmailQueuePayload` |

The kind word on a payload interface is always LAST. A BullMQ `job.data` payload ends `QueuePayload` — **never `Worker`, `Job`, or `Process`**, and never a kind placed before the action (`INotificationWorkerPayload` and `INotificationEmailWorkerBulkPayload` are both wrong).

Never `UPPER_SNAKE_CASE` — not for enums, not for constants. Everything on the wire is camelCase; there is no snake_case anywhere in this project.

**Imports use path aliases, never `../`:**
`@app/* @common/* @config @configs/* @modules/* @queues/* @routes/* @router @migration/* @test/* @generated/* @package`. `@prisma/client` resolves to `generated/prisma-client`.

---

## Strict nulls

- `undefined` is legal ONLY on a Request or Query DTO field (`field?: Type`). Every layer deeper uses `null`.
- **Never `field?: Type | null`** — it is ambiguous, pick one.
- Service and repository params: `param: Type | null`. Config interfaces (`src/configs/`): `field: Type | null`. Prisma returns: `Type | null`.
- Response DTO: wrapper/structural fields use `?:`; domain data fields use `| null`.
- Request-lifecycle and external-spec interfaces (JWT claims, `IRequestApp`, Prisma generated types) and exception/option bags keep `?:`.
- No `any` — use `unknown` plus narrowing. A non-null `!` only where the value is structurally guaranteed.

```typescript
// Controller normalizes at the boundary
await this.userService.updateProfile(userId, dto.bio ?? null);

// Repository owns the null → {} normalization
where: { ...(status ?? {}), ...(role ?? {}), deletedAt: null }
```

---

## DTOs

- **Request DTO** (`dtos/request/`): every field carries class-validator decorators plus `@ApiProperty`. Normalize with `@Transform` here, never in the service. Shared validators live in `src/common/request/validations/`.
- **Response DTO** (`dtos/response/`): serialization runs `plainToInstance` with `excludeExtraneousValues: true`, so **every field you intend to return needs `@Expose()`** — a field without it is silently dropped from the response. Nested DTOs and arrays of DTOs need `@Type(() => X)`. Hide an inherited field with `@Exclude()` **and** `@ApiHideProperty()`.

---

## Controller decorator order (exact — never reorder)

```typescript
@ExampleDoc()                          // 1.  Swagger doc factory
@Response('example.action')            // 2.  @Response / @ResponsePaging / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3.  Term policy
@PolicyAbilityProtected({...})         // 4.  CASL policy
@RoleProtected(...)                    // 5.  Role
@ActivityLog(...)                      // 6.  Activity log (requires @AuthJwtAccessProtected)
@UserProtected()                       // 7.  User status
@AuthJwtAccessProtected()              // 8.  JWT (or a social guard on that route)
@FeatureFlagProtected(...)             // 9.  Feature flag
@ApiKeyProtected()                     // 10. API key
@HttpCode(HttpStatus.OK)               // 11. Only when it differs from the default
@Get('/endpoint')                      // 12. HTTP method — always last
```

The `@Response('key')` argument is an i18n message path, not a literal message. Handler return types must match the decorator: `IResponseReturn<T>`, `IResponsePagingReturn<T>`, `IResponseFileReturn`.

Route params are camelCase and explicit — `@Get('/get/:userId')` with `@Param('userId')`, never a bare `:id`. The route template, the `@Param` key, and the Swagger param name must agree.

Every endpoint gets a matching factory in `<module>/docs/<module>.<scope>.doc.ts`, composed with `applyDecorators(Doc(...), DocAuth(...), DocGuard(...), DocRequest(...), DocResponse(...))`. Controller scopes are `admin` · `public` · `user` · `system` · `shared`, registered by `src/router/routes/routes.<scope>.module.ts`.

---

## Exceptions

One class per file, at `<module>/exceptions/<module>.<kebab-error>.exception.ts`:

```typescript
export class UserNotFoundException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notFound;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('user.error.notFound');
    }
}
```

- Status-code enums are `Enum<Module>StatusCodeError` with camelCase keys and **numeric** values, contiguous inside the module's block. Reference the member by name — never a numeric literal.
- `messagePath` is a **nested** i18n key: `user.error.notFound` → `src/languages/en/user.json` → `{ "error": { "notFound": "..." } }`. Flat keys do not resolve. Add the key to every language file.
- Never `throw new Error(...)`, and never a raw NestJS `BadRequestException` / `NotFoundException` from application code. Wrap a caught error as `new AppUnknownException(err)`.
- Controllers do not catch application exceptions — the global filter chain maps them.

---

## Pagination

`PaginationService` is injected in **repositories** — never in services or controllers. Database-level only: no `.slice()` over a preloaded array, no filtering after `findMany()`.

Controllers use the decorators rather than hand-parsed `@Query`: `@PaginationOffsetQuery`, `@PaginationCursorQuery`, `@PaginationQueryFilterEqualString`, `@PaginationQueryFilterEqualNumber`, `@PaginationQueryFilterEqualBoolean`, `@PaginationQueryFilterInEnum`, `@PaginationQueryFilterNinEnum`, `@PaginationQueryFilterNotEqual`, `@PaginationQueryFilterDate`.

`availableSearch` / `availableOrderBy` allow-lists come from module constants. The wire param is `perPage`. A filter is a typed structure, never `Record<string, any>` or a `JSON.parse`d blob.

## Queues

Processors extend `QueueProcessorBase`, are decorated `@QueueProcessor(EnumQueue.<name>)`, live in `<module>/processors/`, and return `IQueueResponse`. Real work goes in a `*.processor.service.ts`, not inline in the `job.name` switch. Registration happens in `src/queues/queue.register.module.ts` and `queue.module.ts` — never in the feature module. Priority comes from `EnumQueuePriority`. A job payload interface is `I<Module><Action>QueuePayload` (kind `Queue` last) — never `...WorkerPayload`.

## Shared module

`src/common/` is the shared module: `database` `cache` `redis` `pagination` `request` `response` `logger` `message` `helper` `file` `doc` `aws` `firebase`. Reach for `HelperService`, `PaginationService`, `ResponseUtil`, `MessageService`, `DatabaseService` before writing your own. Never open a second Redis connection. Do not move a feature-owned shape into `src/common/`.

---

## Comments and JSDoc

- **Default to zero comments.** Add one only for a tricky invariant, a security reason, or a deliberate deviation. Never explain a cast, a type subset, or what the next line does.
- **No trailing comments** — put it on its own line above, or make it a JSDoc block.
- Notes use `// @note <text>`; fold it into an existing JSDoc block when the symbol has one. Mark a choice made for performance or to match an existing pattern this way.
- **JSDoc:** one or two lines, above the symbol (above the first decorator when decorated). No `@param`, `@returns`, `@example`, `@throws`, `@implements`. Interfaces get none.
- **No JSDoc at all** in `controllers/`, `docs/`, `repositories/`, and `services/` — their role is fixed by the pattern and self-evident.
- Logging: `private readonly logger = new Logger(ClassName.name)`. Errors are object-first — `logger.error(error, 'message')`; `debug`/`log`/`warn` are message-first. Never log a secret.

## Hard limits

- **Never edit `prisma/schema.prisma`**, and never run `db:generate` / `db:migrate` / `db:push` / `migration:*`. Describe the schema change and stop.
- **Never commit, stage, or unstage.** Leave the git tree exactly as the user arranged it.
- **PNPM only** — `npm` and `yarn` are blocked by `engines`.
- **Read config through `ConfigService.get('namespace.key')`** — never `process.env` directly.
- **Never skip session invalidation** on password change, password reset, logout, device removal, or role change.
- **No backward compatibility.** Nothing external depends on this repo, so build the correct shape and change every call site: no deprecated-but-kept field, no `v1`/`v2` pair, no compat flag, no bridging adapter. Best practice outranks the incumbent pattern.
- **Do not scaffold tests unless asked.** When asked, specs mirror `src/` under `test/` as `test/**/*.spec.ts` — never colocated in `src/`.
- Read the real file before suggesting a change to it; never assume a structure or a signature.
- Verify with `pnpm typecheck`, `pnpm lint`, `pnpm spell`.
