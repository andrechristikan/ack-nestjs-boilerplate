# GitHub Copilot Instructions

Inline suggestion rules for **ack-nestjs-boilerplate**. Match surrounding files; keep suggestions short.

**Stack:** NestJS 11 · TypeScript strict · Prisma → MongoDB (replica set) · Redis (cache `db:0`, BullMQ `db:1`) · PNPM only · Node ≥ 24.11 · JWT ES256/ES512 · class-validator / class-transformer · nestjs-i18n · Pino.

---

## Layering — repository pattern (HARD)

```
Controller ──▶ Service ──▶ Repository ──▶ DatabaseService (Prisma)
```

| Role | Owns | Must not |
|---|---|---|
| **Controller** | Route, decorator stack, `undefined → null` at boundary, return shape | Business rules, repositories, pagination metadata |
| **Service** | Business rules, orchestration, typed exceptions, i18n `messagePath` | `DatabaseService`, Prisma `where`/`select`, `$transaction`, filter `?? {}` |
| **Repository** | Prisma via `databaseService.client`, filter `null → {}`, `$transaction`, softDelete/restore | Module exceptions, i18n, HTTP, DTOs |

- **Service interface REQUIRED.** `interfaces/<feature>[.<name>].service.interface.ts` → `I<Feature>[<Name>]Service`; class `implements` it. Inject by **class** (`UserService`), not a token, unless a real multi-implementor seam exists.
- **Repository interface FORBIDDEN.** No `I*Repository`. Inject the repository class.
- Data-shape interfaces (`IUser`, payloads) stay. Framework contracts (`OnModuleInit`, `CanActivate`, …) stay. Pure Nest plumbing (`DatabaseService`, …) needs no `I*Service`.
- Controllers register in `src/router/routes/routes.<scope>.module.ts`. Processors register in `src/queues/` — never inside the feature module. No `forwardRef`.

Feature folders (take only what you need): `constants/ controllers/ decorators/ docs/ dtos/{request,response}/ enums/ exceptions/ factories/ guards/ indicators/ interceptors/ interfaces/ processors/ repositories/ services/ templates/ utils/ validations/`.

---

## Naming

**Files:** `<module>.<noun-or-action>[.<sub>].<role>.ts` — module prefix always; `.` between segments; `-` only inside a segment. Folders kebab-case.

Roles: `.service .repository .controller .guard .strategy .decorator .interceptor .filter .middleware .pipe .processor .indicator .factory .validation .util .dto .doc .module .enum .constant .interface .exception`

| Kind | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserService`, `UserAdminController` |
| Service interface | `I` + PascalCase + `Service` | `IUserService` |
| Data interface / type | `I` + PascalCase | `IUser`, `IPaginationQuery` |
| Enum type | `Enum` + PascalCase | `EnumQueue` |
| Enum key AND value | camelCase | `notFound` |
| Constant | PascalCase | `AuthJwtAccessGuardKey` |
| Method / field | camelCase | `findById` |
| Request / Response DTO | `…RequestDto` / `…ResponseDto` | `UserCreateRequestDto` |
| Queue payload | `I<Module><Action>QueuePayload` (kind **last**) | `INotificationEmailQueuePayload` |

Never `UPPER_SNAKE_CASE`. Wire is camelCase only. **No `../` imports** — use `@app/* @common/* @configs/* @modules/* @queues/* @routes/* @migration/* @test/* @generated/*`.

---

## Nulls

- `undefined` ONLY on Request/Query DTO (`field?: Type`). Deeper layers use `null`.
- Never `field?: Type | null`. Service/repo params: `Type | null`.
- Response DTO: structural `?:`; domain data `| null`.
- No `any` — `unknown` + narrow. `!` only when structurally guaranteed.
- Controller: `dto.bio ?? null`. Repository: `...(status ?? {})` before Prisma.

---

## DTOs

- **Request** (`dtos/request/`): class-validator + `@ApiProperty` on every field. `@Transform` here, not in the service.
- **Response** (`dtos/response/`): `excludeExtraneousValues: true` — **every returned field needs `@Expose()`** or it is silently dropped. Nested DTOs need `@Type(() => X)`. Hide with `@Exclude()` + `@ApiHideProperty()`.

---

## Controller decorator order (exact — never reorder)

```typescript
@ExampleDoc()                          // 1. Swagger factory
@Response('example.action')            // 2. @Response / @ResponsePaging / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3
@PolicyAbilityProtected({...})         // 4
@RoleProtected(...)                    // 5
@ActivityLog(...)                      // 6 (needs JWT)
@UserProtected()                       // 7
@AuthJwtAccessProtected()              // 8 (or social guard)
@FeatureFlagProtected(...)             // 9
@ApiKeyProtected()                     // 10
@HttpCode(HttpStatus.OK)               // 11 if non-default
@Get('/endpoint')                      // 12 always last
```

Guards run bottom-up (nearest method first). Return `IResponseReturn<T>` / `IResponsePagingReturn<T>` / `IResponseFileReturn`. Route params camelCase + explicit (`:userId` + `@Param('userId')`) — template, `@Param`, and Swagger name must agree. Doc factory in `<module>/docs/`. Scopes: `admin` · `public` · `user` · `system` · `shared`.

---

## Exceptions & status codes

One class per file under `exceptions/`, extends `AppBaseException`:

```typescript
export class UserNotFoundException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notFound;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;
    constructor() { super('user.error.notFound'); }
}
```

- Enums: `Enum<Module>StatusCodeError`, camelCase keys, **5-digit** numeric values in the module block. Reference by member name — never a numeric literal.
- Nested i18n: `user.error.notFound` → `src/languages/en/user.json`. Add every language.
- Never bare `Error` / Nest HTTP exceptions from app code. Wrap unknown as `AppUnknownException`. Controllers do not catch app exceptions.

---

## Pagination · Queues · Database

- **Pagination:** `PaginationService` only in repositories. Controllers use `@Pagination*` decorators — never hand-built metadata. Wire param `perPage`. Allow-lists from module constants.
- **Queues:** `@QueueProcessor(EnumQueue.X)` + `QueueProcessorBase` in `<module>/processors/`. Work in `*.processor.service.ts`, not the `job.name` switch. Register in `src/queues/`. Payload: `I…QueuePayload`.
- **DB:** Only repositories inject `DatabaseService`. Use `databaseService.client`. Soft delete/restore: `client.<model>.softDelete` / `restore`. `$transaction` in the repository only. Prefer `select` constants in `<module>/constants/`.

---

## Comments · Config · Logging

- Default **zero comments**. No method JSDoc on services / repositories / controllers / seeds. Optional one-line class JSDoc only when the name is insufficient. Banned tags: `@param @returns @example @throws @implements …`.
- Rare notes: `// @note: <consequence>` only (decision cost or edit hazard). No trailing comments.
- Config: `ConfigService.get('namespace.key')` — never `process.env` in feature code. Times in config are ms (`InMs` + `ms('…')`); sizes `InBytes` + `bytes('…')`.
- Logger: `private readonly logger = new Logger(ClassName.name)`. Errors object-first: `logger.error(error, 'msg')`. Never log secrets.

---

## Hard limits

- **Never edit `prisma/schema.prisma`** or run `db:*` / `migration:*`. Describe the schema change; stop.
- **Never stage or commit** unless the user names the files.
- **PNPM only.**
- **Session invalidation mandatory** after password change/reset, logout, device removal, or role change.
- **No backward compatibility** — correct shape, update every call site.
- **No `forwardRef`.** No second Redis connection. Prefer `@common` kit (`HelperService`, `PaginationService`, …) before inventing one.
- Specs (when asked): mirror under `test/**/*.spec.ts` — never colocated in `src/`. Controllers/repositories are outside the coverage set.
- English for code, comments, commits, docs. Read the real file before changing it. Verify with `pnpm typecheck`, `pnpm lint`, `pnpm spell`.
