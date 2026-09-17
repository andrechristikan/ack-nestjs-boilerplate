# GitHub Copilot Instructions

Inline suggestion rules for **ack-nestjs-boilerplate**, digested from `.claude/rules/`. Match
surrounding files; keep suggestions short. When this file and a rule disagree, the rule wins.

**Stack:** NestJS 12 · TypeScript 6 strict · native ESM (`"type": "module"`, `verbatimModuleSyntax`) ·
Node ≥ 24.15 · PNPM only · Prisma 6 → MongoDB (replica set) · Redis (cache `db:0`, BullMQ `db:1`) ·
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
| **Repository** | Prisma via `databaseService.client` or `tx`, filter `null → {}` | Feature exceptions, i18n, another model |
| **Util** | Pure shaping (hash, map, compare) | IO, decisions, another module's util |
| **Queue class** (`queues/`) | The only `add` / `upsertJobScheduler`; encrypts secret payload fields | Business rules |

- **Repository header interface REQUIRED:** `I<Feature>Repository` in `interfaces/…repository.interface.ts`, class `implements` it. Inject the class.
- **No header interface** for a domain, HTTP service, processor service, util, cache, queue, factory, or any `src/common/` service or util.
- Modules per feature: `<feature>.repository|domain|http|processor.module.ts`. Controllers register in `src/router/http/router.http.<scope>.module.ts`; processor modules are aggregated by `src/router/processor/router.processor.module.ts`. No `forwardRef`.
- An injected class is a **value import** — `import type` erases DI metadata and fails at boot.

---

## Naming

**Files:** `<module>.<noun-or-action>[.<sub>].<role>.ts` — module prefix always (except `src/main.ts`, `src/migration.ts`, `src/instrument.ts`, `src/swagger.ts`); `.` between segments; `-` only inside a segment.

| Kind | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserDomain`, `UserHttpService`, `UserAdminController` |
| Type / interface | `I` + PascalCase | `IUser`, `IUserRepository` |
| Enum type | `Enum` + PascalCase | `EnumQueue` |
| Enum key AND value | camelCase | `notFound` |
| Constant | PascalCase | `AuthJwtAccessGuardKey` |
| Method / field | camelCase | `findById` |
| DTO | `…RequestSchema` + `…RequestDto`, `…ResponseSchema` + `…ResponseDto` | `UserCreateRequestSchema` |
| Queue payload | `I<Module><Action>QueuePayload` (kind **last**) | `INotificationEmailQueuePayload` |

Never `UPPER_SNAKE_CASE`. Wire is camelCase only. **No `./` or `../` imports** — aliases:
`@app/* @common/* @configs/* @modules/* @router/* @migration/* @queues/* @test/* @generated/* @instrument @swagger @main @migration`.
Prisma from `@generated/prisma-client/client`, never `…/internal`. Node built-ins as `node:*`. lodash only as named imports from `lodash-es`.

---

## DTOs and validation

- A DTO is a **zod schema + `z.infer` type**. **One `*.dto.ts` file = exactly one schema** and its type; nested shapes inline; shared checks from `src/common/request/validations/`.
- Request schema: `z.strictObject`, every field constrained and `.meta({ description, example })`. Response schema: `z.object` (undeclared keys are stripped).
- `@Body({ schema })`, `@Param('id', { schema: RequestMongoIdSchema })`. A route returning data declares `@Response(path, { schema })`.

## Nulls

- `undefined` ONLY on request/query DTOs (`.optional()`). Deeper layers use `null`.
- Never `field?: Type | null`. No `any` — `unknown` + narrow.

---

## Controller decorator order (exact — never reorder)

```typescript
@ExampleDoc()                          // 1. Swagger doc factory
@Response('example.action')            // 2. @Response / @ResponsePaging / @ResponseFile
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

Guards run bottom-up. Admin routes never carry workspace/project guards. Return `IResponseReturn<T>` / `IResponsePagingReturn<T>` / `IResponseFileReturn`. Scopes: `admin` · `public` · `user` · `system` · `shared`.

- **Every JWT-protected handler** (`@AuthJwtAccessProtected` / `@AuthJwtRefreshProtected`) carries `@RequestThrottle({ user: true })`. One call per handler; a sensitive route adds `route:` in that same call. `public` and `system` omit it. Method decorator only; class-level does not compile.
- **`@FeatureFlagProtected` takes the bare key.** Workspace-scoped and project-scoped routes on `user` / `shared` / `public` carry `@FeatureFlagProtected('workspace')`. Admin does not.
- **`@RoleProtected` never lists `superAdmin`.** The bypass runs before the required list.
- **Activity is not a decorator.** A domain stages with `ActivityLogDomain.stage(...)` after success.

---

## Exceptions & status codes

One class per file under `exceptions/`, extends `AppBaseException`; enum `Enum<Module>StatusCodeError` with 5-digit values in the module's block; i18n path `<module>.error.<key>` nested in `src/languages/en/<module>.json`. Never a bare `Error` or Nest HTTP exception from app code; wrap unknown errors as `AppUnknownException`.

---

## Database · Queues · Security

- **DB:** only repositories query `databaseService.client`; a domain opens `databaseService.withTransaction` only when the work spans more than one repository and passes `tx` to `*InTx(tx, …)` methods; a multi-statement write on one repository's model opens its transaction inside that repository. Soft delete: `client.<model>.softDelete` / `restore`. `createdBy` / `updatedBy` are stamped from the request actor (nested writes included); pass them explicitly only where there is no HTTP actor.
- **Queues:** `@QueueProcessor(EnumQueue.X)` + `extends QueueProcessorBase` (constructor passes `sentryService` to `super`). Work in `*.processor.service.ts`. `return await` inside `try`. Unretryable failure → `UnrecoverableError`.
- **Crypto:** `node:crypto` through `Helper*` services only. AES-256-GCM via `HelperEncryptionService.aes256Encrypt(value, secret, purpose, context)`. `randomInt` / `randomBytes`, never `Math.random`. Secret comparisons via `sha256Compare` (constant-time). No MD5, no `crypto-js`.
- **Secrets:** never in a log, a URL, a response, activity metadata, or a plaintext job payload. Add new sensitive keys to `LoggerSensitiveFields`.
- **Sessions:** invalidate after password change/reset, logout, device removal, admin revoke, or role/status change (admin `blocked`/`inactive` revokes every session). Revoke in the DB, then purge exactly those ids from the session cache.
- **Activity log:** `ActivityLogDomain.stage(...)` after success. An action on another user stages two rows — the actor's action plus the paired `…ByAdmin`/`…ByOwner`/`…ByInvitee` action for the affected user (`userId`, `createdBy` = actor) — with `targetUserId` / `actorUserId` in metadata; skip the pair when actor and target are the same user.

---

## Comments · Config · Logging

- Default **zero comments**. Banned JSDoc tags: `@param @returns @example @throws @implements …`.
- Every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts`, `*.exception.ts`, `*.constant.ts` carries a one-line JSDoc plus `@public`.
- Config: `ConfigService.get('namespace.key')` — never `process.env` in feature code. Durations `In<Unit>` from `ms('…')`; sizes `InBytes` from `bytes('…')`; URLs are `…Pattern` keys with `.replace('{x}', () => value)`.
- Logger: `private readonly logger = new Logger(ClassName.name)`; errors object-first. Sentry reporting goes through `SentryService` from the filter chain and `QueueProcessorBase`.

---

## Hard limits

- `prisma/schema.prisma` may be edited; never run `db:migrate`, `db:studio` or `migration:*`.
- Never stage or commit unless asked. PNPM only.
- No backward compatibility — correct shape, update every call site.
- Specs mirror `src/` under `test/**/*.spec.ts` (Vitest, `vitest-mock-extended`); controllers, processors and repositories are outside the coverage set.
- English for code, comments, commits, docs. Verify with `pnpm typecheck`, `pnpm lint`, `pnpm deadcode`, `pnpm spell`.
