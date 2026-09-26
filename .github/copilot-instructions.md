# GitHub Copilot Instructions

Inline suggestion rules for **ack-nestjs-boilerplate**, digested from `.claude/rules/`. Match
surrounding files; keep suggestions short. When this file and a rule disagree, the rule wins.

**Stack:** NestJS 12 · TypeScript 6 strict · native ESM (`"type": "module"`, `verbatimModuleSyntax`) ·
Node ≥ 24.15 · PNPM only · Prisma 6 → PostgreSQL · Redis (cache `db:0`, BullMQ `db:1`) ·
zod 4 + `zod-openapi` · nestjs-i18n · Pino · Sentry · Vitest.

---

## Layering (HARD)

```
Controller ──▶ HTTP Service ──────┐
                                  ├──▶ Domain ──▶ Repository ──▶ DatabaseService (Prisma)
Processor ───▶ Processor Service ─┘
```

| Role | Owns | Must not |
|---|---|---|
| **Controller** | Route, decorator stack, return shape | Business rules, domains, repositories |
| **HTTP / processor service** | Translating DTO or job payload into domain calls, response DTOs | Business rules, repositories |
| **Domain** (`domains/`) | Business rules, orchestration, typed exceptions, i18n paths, `withTransaction` | Model queries on `client`, HTTP, `Job` |
| **Repository** | Prisma via `databaseService.client` or `tx`, filter `null → {}` | Feature exceptions, i18n, a write to another model |
| **Util** | Pure shaping (hash, map, compare) | IO, decisions, another module's util |
| **Queue class** (`queues/`) | The only `add` / `upsertJobScheduler`; encrypts secret payload fields | Business rules |

- **Repository header interface REQUIRED:** `I<Feature>Repository` in `interfaces/<module>.[<concern>-]repository.interface.ts`, class `implements` it. Inject the class. A filename carries at most four dot-separated name parts, an `*.interface.ts` at most three; extra middle segments collapse with `-`.
- **No header interface** for a domain, HTTP service, processor service, util, cache, queue, factory, or any `src/common/` service or util.
- Modules per feature: `<feature>.repository|domain|http|processor.module.ts`. Controllers register in `src/router/http/router.http.<scope>.module.ts`; processor modules are aggregated by `src/router/processor/router.processor.module.ts`. No `forwardRef`.
- An injected class is a **value import** — `import type` erases DI metadata and fails at boot.
- **`+` never joins strings.** Two fragments are a template literal; a placeholder string is a `{token}` pattern. One token: `String.prototype.replace` with a function replacement whenever the value is not a literal in the same file. Two or more: `HelperStringService.fillPattern(pattern, values)`, one pass, so a value cannot carry a later token's text.
- **A `this.` call lands in a `const` before it is used** as an argument, an object property, a condition, a compound expression, a template, a spread, a `for…of` iterable, an index, a `throw` operand, or a ternary branch. `return this.x()`, an arrow whose body IS the call, an array element and `this.m.bind(this)` stay inline. No linter enforces it; review does.
- **One statement needs no transaction.** `withTransaction` covers a multi-statement or multi-document write; the repository owns it when the write is its own, the domain when it spans repositories. `client.$transaction` is called nowhere else, and a write conflict is not retried.

---

## Naming

**Files:** `<module>.<noun-or-action>[.<sub>].<role>.ts` — module prefix always (except `src/main.ts`, `src/migration.ts`, `src/instrument.ts`, `src/swagger.ts`); `.` between segments; `-` only inside a segment.

| Kind | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserDomain`, `UserHttpService`, `UserAdminController` |
| Type / interface | `I` + PascalCase | `IUser`, `IUserRepository` |
| Enum type | `Enum` + PascalCase | `EnumQueue` |
| Enum key AND value | camelCase | `notFound` |
| Constant | PascalCase | `AuthJwtAccessGuardKey`, `AuthJwtAccessDocSecurityName` |
| Method / field | camelCase | `findById` |
| DTO | `…RequestSchema` + `…RequestDto`, `…ResponseSchema` + `…ResponseDto` | `UserCreateRequestSchema` |
| Queue payload | `I<Module><Action>QueuePayload` (kind **last**) | `INotificationEmailQueuePayload` |
| Narrowed list read | `I<Module>List` — never a `Row` suffix | `IUserList` |
| Prisma select constant | `<Module>[<Audience>][<Concern>]Select` | `UserAdminListSelect` |
| Contract table | `<Module><Concept>Contract`, one per file under `contracts/` | `ActivityLogActionContract` |

**One controller per scope** (`<module>.<scope>.controller.ts`), whatever its size; concerns split in the HTTP services. **At most two constants files:** `<module>.constant.ts`; `<module>.list.constant.ts` only when the module has a list endpoint. Empty file → delete. **One interface per file**, except the module's own `<module>.interface.ts` collection; a data constant never sits in a class file. OpenAPI is co-located on runtime decorators — no module `docs/*.doc.ts`.

Never `UPPER_SNAKE_CASE`. Wire is camelCase only. **No `./` or `../` imports** — aliases:
`@app/* @common/* @configs/* @modules/* @router/* @migration/* @queues/* @test/* @generated/* @instrument @swagger @main @migration`.
Prisma from `@generated/prisma-client/client`, never `…/internal`. Node built-ins as `node:*`. lodash only as named imports from `lodash-es`.

---

## DTOs and validation

- A DTO is a **zod schema + `z.infer` type**. **One `*.dto.ts` file = exactly one schema** and its type; nested shapes inline; shared checks from `src/common/request/validations/`.
- Request schema: `z.strictObject`, every field constrained and `.meta({ description, example })`. Response schema: `z.object` (undeclared keys are stripped).
- `@Body({ schema })`, `@Param('id', { schema: RequestUuidSchema })`. A route returning data declares `@Response(path, { schema })`.

## Nulls

- `undefined` ONLY on request/query DTOs (`.optional()`). Deeper layers use `null`.
- Never `field?: Type | null`. No `any` — `unknown` + narrow.

---

## Controller decorator order (exact — never reorder)

```typescript
@Doc({ summary: '…' })                 // 1. OpenAPI operation + global error kit
@Response('example.action')            // 2. @Response / @ResponsePagination / @ResponseFile
@TermPolicyAcceptanceProtected(...)    // 3
@PolicyProtected({...})                // 4  admin
@RoleProtected(...)                    // 5  admin
@ProjectMemberProtected()              // 6
@ProjectProtected()                    // 7
@WorkspaceMemberProtected(...)         // 8
@WorkspaceProtected()                  // 9
@UserProtected()                       // 10
@FeatureFlagProtected(...)             // 11
@AuthJwtAccessProtected()              // 12 (or social guard)
@ApiKeyProtected()                     // 13
@HttpCode(HttpStatus.OK)               // 14 only on @Post, only when not the default
@Get('/endpoint')                      // 15 always last
```

Guards run bottom-up. Admin routes never carry workspace/project guards. Return `IResponseReturn<T>` / `IResponsePaginationReturn<T>` / `IResponseFileReturn`. Scopes: `admin` · `public` · `user` · `system` · `shared`.

- **Every JWT-protected handler** (`@AuthJwtAccessProtected` / `@AuthJwtRefreshProtected`) carries `@RequestThrottle({ user: true })`. One call per handler; a sensitive route adds `route:` in that same call. `public` and `system` omit it. Method decorator only; class-level does not compile.
- **OpenAPI is co-located.** `@Doc` + `@DocErrors` (escape hatch) on the controller; success/errors on `@Response` / `@ResponsePagination` / `@ResponseFile`; auth/guard kits on matching `*Protected`; list queries from zod `@Query({ schema })`; multipart from `FileUpload*`; guard-owned `projectId` from `ProjectProtected` (`ApiParam`). No module `*.doc.ts` factories. `DocResponseError` (internal) merges entries per HTTP status via `DocResponseEntryMetaKey` so stacked kits compose. Paginated success uses `baseSchema: ResponsePaginationSchema`.
- **OpenAPI security scheme names are module consts** (`AuthJwtAccessDocSecurityName = 'accessToken'`, …, `ApiKeyDocSecurityName = 'xApiKey'`), never magic strings at `ApiBearerAuth` / `ApiSecurity` / `addBearerAuth` / `addApiKey`. Scheme values are camelCase.
- **Swagger errors follow ownership.** Global on `@Doc`; pagination kits on `@ResponsePagination` (both offset and cursor); upload on `FileUpload*`; download on `@ResponseFile`; guard/auth on `*Protected`. Module-flow errors that must appear use `@DocErrors`. JWT `accessTokenUnauthorized` from `AuthJwtAccessProtected` only — never `UserProtected`.
- **`@Response` options** are `schema` and `cache` only. Success HTTP status and body `statusCode` follow `@HttpCode` or Nest defaults (`POST` → 201, else 200).
- **List queries:** kit base `PaginationOffsetQuerySchema` / `PaginationCursorQuerySchema`; modules `.extend` `search`/`orderBy` only when allow-lists are non-empty, plus filters; HTTP service uses `PaginationQueryUtil` (pure util — no RequestStore inject; `field` is string-generic). Prisma-backed `availableSearch` / `availableOrderBy` use `Prisma.<Model>ScalarFieldEnum` with `as const satisfies`; filter helpers take the enum member, not a magic string. Computed / analytic lists keep `(keyof I*)[]`. `@ResponsePagination` has no `type` option and emits no `ApiQuery`.
- **`@FeatureFlagProtected` takes the bare key.** Workspace-scoped and project-scoped routes on `user` / `shared` / `public` carry `@FeatureFlagProtected('workspace')`. Admin does not.
- **`@RoleProtected` never lists `superAdmin`.** The bypass runs before the required list.
- **Activity is not a decorator.** A domain prepares with `ActivityLogDomain.prepare(...)` before the write and stages with `stagePrepared(...)` after it.

---

## Exceptions & status codes

One class per file under `exceptions/`, extends `AppBaseException`; enum `Enum<Module>StatusCodeError` with 5-digit values in the module's block; i18n path `<module>.error.<key>` nested in `src/languages/en/<module>.json`. Never a bare `Error` or Nest HTTP exception from app code; wrap unknown errors as `AppUnknownException`.

---

## Database · Queues · Security

- **DB:** a paginated read whose row is narrower than the model passes a `select` (mutually exclusive with `include`, `findMany` only), so a password hash or a session `jti` never leaves the database; only repositories query `databaseService.client`; a domain opens `databaseService.withTransaction` only when the work spans more than one repository and passes `tx` to `*InTx(tx, …)` methods; a multi-statement write on one repository's model opens its transaction inside that repository. Soft delete: `client.<model>.softDelete` / `restore`. `createdBy` / `updatedBy` are stamped from the request actor (nested writes included); pass them explicitly only where there is no HTTP actor.
- **Queues:** `@QueueProcessor(EnumQueue.X)` + `extends QueueProcessorBase` (constructor passes `sentryService` to `super`). Base owns concrete `process` (try / await `handle` / catch + `job.log` metadata-only, never `job.data`; `job.log` faults swallowed). Subclass implements `protected handle` — dispatcher only; `return await` service calls; feature remaps (`HelperDecryptFailedException` → `UnrecoverableError`) inside `handle`. No per-processor log-and-rethrow. `onFailed` fatal gate + Sentry `withScope` job id/name/attemptsMade/maxAttempts. Factories set `keepLogs`.
- **Crypto:** `node:crypto` through `Helper*` services only. AES-256-GCM via `HelperEncryptionService.aes256Encrypt(value, secret, purpose, context)`. `randomInt` / `randomBytes`, never `Math.random`. Secret comparisons via `sha256Compare` (constant-time). No MD5, no `crypto-js`.
- **Secrets:** never in a log, a URL, a response, activity metadata, or a plaintext job payload. Add new sensitive keys to `LoggerSensitiveFields`.
- **Sessions:** invalidate after password change/reset, logout, device removal, self-deletion, lockout, two-factor disable or reset, admin revoke, or role/status change (admin `blocked`/`inactive` revokes every session). Order is commit, purge, stage. A partial revoke purges exactly the revoked ids; a whole-user revoke scans and unlinks every key of that user.
- **Store decorators** (`@UserCurrent()`, `@WorkspaceCurrent()`, `@ApiKeyPayload()`, `@AuthJwtPayload()`, …) read CLS in their own `createParamDecorator` factory, take an optional typed field, return non-null, and throw `RequestContextMissingException` (50304) when the value or field is missing. `@ProjectMemberCurrent()` only under the role-less `@ProjectMemberProtected()`.
- **Activity log:** `ActivityLogDomain.prepare(...)` before the write, `stagePrepared(...)` after it; a path that always throws carries `onError: true`. An action on another user stages two rows — the actor's action plus the paired `…ByAdmin`/`…ByOwner`/`…ByInvitee` action for the affected user (`userId`, `createdBy` = actor) — with `targetUserId` / `actorUserId` in metadata; skip the pair when actor and target are the same user.

---

## Comments · Config · Logging

- Default **zero comments**. Banned JSDoc tags: `@param @returns @example @throws @implements …`.
- Every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts`, `*.exception.ts`, `*.constant.ts`, `*.contract.ts` carries a one-line JSDoc plus `@public`.
- Config: `ConfigService.get('namespace.key')` — never `process.env` in feature code. Durations `In<Unit>` from `ms('…')`; sizes `InBytes` from `bytes('…')`; URLs are `…Pattern` keys with `.replace('{x}', () => value)`.
- Logger: `private readonly logger = new Logger(ClassName.name)`; errors object-first. No log-and-rethrow — filters and `QueueProcessorBase` own the single failure log. Sentry reporting goes through `SentryService` from the filter chain and `QueueProcessorBase` (`onFailed` enriches job metadata via `withScope` before `captureException`).

---

## Hard limits

- `prisma/schema.prisma` may be edited; never run `db:migrate`, `db:studio` or `migration:*`.
- Never stage or commit unless asked. PNPM only.
- No backward compatibility — correct shape, update every call site, including CI, docker, compose, and `package.json` scripts when those name the change.
- Specs under `test/**/*.spec.ts` are **unit** (Vitest, `vitest-mock-extended`): every collaborator is a double. A domain spec mocks the repository; a repository is not a unit subject. Integration (real Prisma/PostgreSQL) and e2e (running app) are not this suite. Controllers, processors, repositories, and contracts are outside the coverage set; the doc kit in `src/common/doc/` is inside it. `isolate: false`, `fsModuleCache: true`, `pool: forks`. Nest `Logger` is muted in `test/setup.ts` (no-ops on the class; not `vi.mock('@nestjs/common')` and not a `console` spy). A behaviour lands red-first. `.github/workflows/test.yml` is `workflow_dispatch`.
- English for code, comments, commits, docs. Verify with `pnpm typecheck`, `pnpm lint`, `pnpm deadcode`, `pnpm spell`.
