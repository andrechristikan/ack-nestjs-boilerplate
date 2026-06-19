# ACK NestJS Boilerplate — Claude Code Instructions

> Read this file top to bottom. It is an execution order: §0 before you act → §1 guardrails → §2–8 while you code → §9 before you finish → §10 is the reject list. Rules only — all domain detail lives in `docs/*`.

**Stack:** NestJS v11 · TypeScript strict · Prisma → MongoDB (replica set) · Redis (cache `db:0` / BullMQ `db:1`) · PNPM only · Node ≥ 24.11 · JWT ES256/ES512 · Repository pattern.

---

## 0. BEFORE YOU ACT (HARD — every task, no exception)

Run these steps in order before writing code, suggesting a change, or answering a design question:

1. **Scan `docs/*`.** List `docs/` and READ every doc relevant to the task. Detail is there, not here. **Always ignore `docs/superpowers/*`** when the task concerns this project's documentation. It is local-only planning (specs/plans), not project docs. Never read, update, or cite it as source of truth.
2. **Read the real source.** Open the actual files. Never assume structure, signatures, or names.
3. **Scope it.** Do only what is asked (YAGNI). If unsure, ASK — do not guess and build.
4. **Plan against §2–8.** Confirm the change obeys the principles and rules below before typing.

### Docs index (`/docs`)
`authentication` · `authorization` · `database` · `device` · `two-factor` · `activity-log` · `cache` · `queue` · `notification` · `response` · `request-validation` · `handling-error` · `message` · `pagination` · `file-upload` · `presign` · `feature-flag` · `term-policy` · `security-and-middleware` · `third-party-integration` · `logger` · `configuration` · `environment` · `installation` · `project-structure` · `doc` · `analytics`

When in doubt about a behavior, the matching doc is the source of truth. Read it before touching the code. (`docs/superpowers/*` is excluded: local planning only, never project documentation.)

---

## 1. GUARDRAILS (HARD — never cross without explicit user request)

### Git — never touch the user's tree
- Do NOT run `git commit`, `git add`, stage, or unstage commands on your own.
- Leave the index exactly as the user arranged it. Already-staged files stay staged; unstaged stay unstaged.
- Stage or commit ONLY when the user explicitly asks, and only the files they name.
- When asked to commit: READ `.commitlintrc` first, then PROPOSE the commit message(s) and wait for approval. Never commit before the user accepts the message. The message must pass commitlint.
- Commit message = single-line subject ONLY. No body, no bullet lists, no `Co-Authored-By` footer. Match the repo's convention (`type(scope): summary`). Keep it terse.

### Prisma — schema is off-limits
- Do NOT edit the Prisma schema.
- Do NOT run schema/DB-mutating commands (`db:migrate`, `db:push`, `migration:*`, `db:generate`).
- Need a schema change? Stop and tell the user — do not do it yourself.

---

## 2. PRINCIPLES (HARD — apply on every line)

All four below are mandatory. None optional. Reviewer rejects on violation.

- **SOLID**
  - **S** — one class, one reason to change. Controller routes, Service business logic, Repository data access. Never blur.
  - **O** — extend via new class/strategy/decorator, not by editing stable code with `if/switch` type-checks.
  - **L** — a subclass/implementation must be drop-in for its base/interface. No narrowing behavior, no surprise throws.
  - **I** — small focused interfaces. No fat interface forcing dead method implementations. Split by consumer need.
  - **D** — depend on abstractions. Services depend on injected classes/interfaces, never on `DatabaseService` directly.
- **DRY** — zero copy-paste logic. Extract to base class, util, or shared module. One source of truth for config, connections, constants. Written twice → refactor.
- **KISS** — simplest solution that works. No clever one-liners, no needless layers, no premature generics. Readable > smart.
- **YAGNI** — build only what the current task needs. No "future-proof" params, no unused flags, no speculative hooks, no dead branches. Delete unused code.

**When they pull against each other, resolve in this order:**

1. **Correctness & security** — first, always. Never trade security for brevity.
2. **YAGNI + KISS** — decide whether structure is needed at all.
3. **SOLID + DRY** — shape that structure well once it is justified.

> Duplication beats the wrong abstraction. Do not abstract to satisfy DRY/SOLID against YAGNI/KISS.

### Boilerplate — no backward-compat burden

- No external client depends on this repo. Breaking changes are fine; never keep a worse design for compatibility.
- Default to current community best practice. Pick the clean/correct shape over the existing one.
- Use existing code only as a divergence check: when best practice clashes HARD with an established pattern, WARN the user before applying — do not apply silently. Minor/local divergence: just proceed.

---

## 3. ARCHITECTURE (HARD)

### Repository pattern
- `Repository` → data access ONLY. Injects `DatabaseService` directly (no `@Inject`). No interface.
- `Service` → business logic ONLY. Injects repository as a class. MUST implement an interface (`IUserService`).
- **NEVER** inject `DatabaseService` into a service.
- Repository owns `null → {}` normalization for filter params before Prisma — never in the caller.

### Path aliases (ALWAYS — relative imports forbidden)
- `@app/*` · `@common/*` · `@config` · `@configs/*` · `@modules/*` · `@queues/*` · `@routes/*` · `@router` · `@migration/*` · `@test/*` · `@generated/*` · `@package`
- `@prisma/client` → `generated/prisma-client`

### Module layout
- Standard folder set per module. Read `docs/project-structure.md` before scaffolding — do not invent structure.

---

## 4. NAMING (HARD)

### 4.1 Files

Pattern: `<module>.<noun-or-action>[.<sub>].<role>.ts`

- Every file starts with the `<module>.` prefix. No exception.
- Dot `.` separates segments; dash `-` ONLY inside a compound-noun segment (`user.mobile-number.dto.ts`, `notification.email.processor.ts`).
- Folders: lowercase kebab-case.
- Role suffix matches the artifact: `.service` `.repository` `.controller` `.guard` `.decorator` `.interceptor` `.dto` `.enum` `.constant` `.interface` `.doc` `.util` `.module` `.processor` `.filter`.
- DTO files always end `.dto.ts` (request/response under `dtos/request/` and `dtos/response/`): `user.create.request.dto.ts`, `user.profile.response.dto.ts`.

### 4.2 Identifiers

| Type | Rule | Example (this project) |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserService` |
| Interface | `I` + PascalCase | `IUser`, `IUserService` |
| Enum name | `Enum` + PascalCase | `EnumQueue`, `EnumRoleStatusCodeError` |
| Enum keys/values | camelCase | `notFound`, `notificationEmail` |
| Constants | PascalCase (objects AND primitives) | `AuthJwtAccessGuardKey` |
| Methods / vars / fields | camelCase | `findById` |
| Payload interface | `I` + `<Module>` + `<Action>` + `Payload` | `INotificationSendPushPayload` |
| Request DTO | `<Module>...RequestDto` suffix | `UserCreateRequestDto` |
| Response DTO | `<Module>...ResponseDto` suffix | `UserProfileResponseDto` |

### 4.3 Rules

- **All types start with `I`.** Interfaces, payload shapes, service contracts: `IUser`, `IUserService`, `INotificationVerificationEmailPayload`. No bare type name.
- **Enums** — `Enum` prefix + PascalCase name; keys AND values camelCase (NOT UPPER_CASE). One enum concern per file. Error-code enums use numeric values.
- **Constants** — PascalCase for everything: typed objects/arrays and single primitives alike. No UPPER_SNAKE_CASE.
- **DI tokens** — rare; prefer direct class injection (repository as class). When a token IS needed, name it PascalCase and wrap the value in `Symbol()`.
- **DTOs** — every DTO carries the `Dto` suffix on BOTH class name and file name (`*RequestDto`/`user.*.request.dto.ts`, `*ResponseDto`/`user.*.response.dto.ts`). There is no usecase layer.

---

## 5. DECORATOR ORDER (HARD — exact, never reorder)

```typescript
@ExampleDoc()                          // 1. Swagger doc
@TermPolicyAcceptanceProtected(...)    // 2. Term policy
@PolicyAbilityProtected({...})         // 3. CASL policy
@RoleProtected(...)                    // 4. Role
@ActivityLog(...)                      // 5. Activity log
@UserProtected()                       // 6. User status
@AuthJwtAccessProtected()              // 7. JWT
@FeatureFlagProtected(...)             // 8. Feature flag
@ApiKeyProtected()                     // 9. API key
@HttpCode(HttpStatus.OK)               // 10. HTTP status (only when needed)
@Get('/endpoint')                      // 11. HTTP method (always last)
```

- Guard/protection semantics → read `docs/authorization.md`.
- `@ActivityLog` requires `@AuthJwtAccessProtected`. Logs both success and failure. Metadata is set via `RequestStoreService.merge(ActivityLogMetadataStoreKey, ...)`, never returned in the response shape. Never logs secrets. → `docs/activity-log.md`.

---

## 6. STRICT NULL TYPES (HARD)

- `undefined` is allowed ONLY at the input boundary (Request DTO body, Query DTO). Every deeper layer uses `null`.

| Layer | Convention |
|---|---|
| Request/Query DTO (input boundary) | `field?: Type` |
| Response DTO — wrapper/structural | `field?: Type` |
| Response DTO — domain data | `field: Type \| null` |
| Domain interface — data | `field: Type \| null` |
| Domain interface — request lifecycle / external spec (JWT, Prisma) | `field?: Type` |
| Exception / options bag | `field?: Type` |
| Config interface (`src/configs/`) | `field: Type \| null` |
| Service/Repository — data param | `param: Type \| null` |
| Service/Repository — filter param | `param: Type \| null` (additive service filter may use `?`) |
| Prisma return | `Type \| null` |

- **NEVER** `field?: Type \| null` — ambiguous. Pick one.
- Controller normalizes `undefined → null` before calling a service: `service.update(id, dto.bio ?? null)`.
- No `any` (`noImplicitAny`). No ignored null checks (`strictNullChecks`).

---

## 7. CODE STYLE (HARD)

- **NestJS idiomatic.** Use the framework the Nest way — modules, DI, providers, guards, pipes, interceptors, decorators. No hand-rolled substitutes for what Nest already provides.
- **No unit tests.** Do not write or scaffold tests unless the user explicitly asks.
- **Minimal comments (strict).** The user dislikes comment noise. Default to ZERO comments. Add one ONLY when it is genuinely critical and the code cannot convey it: a tricky invariant, a security reason, a deliberate deviation. Never explain a cast, a type subset, an obvious call, or what the next line does. When in doubt, leave it out. Reviewer rejects on excess.
- **Notes** — mark with `// @note <text>`. If the symbol already has a JSDoc block, put the note inside it instead — do not add a separate `// @note`.
- **No trailing comments.** Never place a `//` comment to the right of or at the end of a line of code. Put the comment on its own line ABOVE the code; when it documents a declaration, make it a JSDoc block instead.
- **JSDoc** — terse and to the point. State what matters, skip filler. Do not restate the signature or types the code already shows. Specific rules:
  - Always place JSDoc directly ABOVE the symbol (class, method, function, const, property). Never below.
  - When the symbol is decorated, JSDoc goes ABOVE the first decorator, never between a decorator and the declaration.
  - One or two lines max. Describe WHAT, plus any non-obvious WHY (a security reason, a tricky invariant, a deliberate deviation, a notable throw condition).
  - NO `@example`, `@param`, `@returns`, `@template`, `@throws`, `@private`, `@export`, `@class`, `@implements`, `@constraint`, `@remarks`. They restate the signature. Fold anything worth keeping into the prose sentence.
  - Module classes with `forRoot()`/`forRootAsync()`: document the module ONCE at the class level; do NOT document the `forRoot` method separately.
  - Interfaces get NO JSDoc, including per-field comments (the doc lives on the implementing service). Applies to data-shape, payload, options, AND service-contract interfaces. If a field carries a genuinely critical invariant or deliberate type override, convert it to a single terse `// @note` line instead.
  - Not everything needs JSDoc. Symbols self-evident from name + signature (thin wrappers, trivial getters, lifecycle hooks with no surprising behavior, private helpers that just delegate) get NONE. Keep JSDoc only where it adds real value.
  - Constants: at most a 1-line JSDoc, only when the value's rationale is non-obvious (e.g. a limit tied to an external cap). Self-evident constants (DI tokens, obvious names) get none. Enums: only when a value's meaning is non-obvious.
  - DTOs: a 1-line class JSDoc if it helps; fields already covered by `@ApiProperty` need none.
  - NO JSDoc at all in the `controllers/`, `docs/` (Swagger `*.doc.ts`), `repositories/`, and `services/` layers — their role is fixed by the pattern (route delegation, Swagger doc, data access, business logic) and is self-evident. Do not add it; remove any that exists. (`// @note` and `// TODO` line comments may stay.)
- **No em-dash in `docs/*.md` prose.** Never use `—` in documentation prose. Use proper punctuation instead (period, comma, semicolon, colon, or parentheses). Plain hyphens in compound words (`dev-mode`, `in-memory`) are fine; do not overuse them. Exception: an existing structured list whose every entry already uses `—` as a separator — match it for consistency rather than breaking the pattern on one line.

---

## 8. ERRORS · RESPONSES · CONFIG (rules; detail in docs)

- **Errors** — throw Nest exceptions with `{ statusCode, message: '<i18n.key>', messageProperties?, data? }`. i18n keys are nested JSON, filename = prefix (`user.error.notFound` → `languages/en/user.json`). → `docs/handling-error.md`, `docs/message.md`.
- **Responses** — use `@Response` / `@ResponsePaging`. Return `{ data, metadata? }`. → `docs/response.md`.
- **Validation** — `class-validator` + `@Expose` on DTOs. → `docs/request-validation.md`.
- **Config** — every `src/configs/*` file exports a TS interface alongside `registerAs`. → `docs/configuration.md`, `docs/environment.md`.
- **Transactions** — array form for simple sequential, callback form for conditional logic. MongoDB replica set required. → `docs/database.md`.
- **Logging** — `new Logger(ClassName.name)`, object first then message: `logger.error(error, 'msg')`. Secrets auto-redacted by Pino — never log them anyway.

---

## 9. BEFORE YOU FINISH (HARD — verify, do not assume)

Run in order and confirm each passes before claiming done:

1. `pnpm typecheck` — must be clean (zero errors).
2. `pnpm lint` — must be clean (use `pnpm lint:fix` for autofixable).
3. `pnpm spell` — fix unknown words or add to `cspell.json`.
4. Re-check the diff against §10. If any item matches, fix it.

- Report failures honestly with the real output. Never claim a step passed without running it.
- Mention any deliberate deviation (performance / matching existing code) in the reply.
- Do NOT commit or stage (§1). Leave verification results for the user to commit.

---

## 10. ANTI-PATTERNS (NEVER — reject list)

- Commit, stage, or unstage without an explicit user request → leave the tree alone (§1).
- Commit without proposing a commitlint-valid message and getting approval first → §1.
- Edit the Prisma schema or run schema/DB commands → stop and tell the user (§1).
- Inject `DatabaseService` into a service → use repository.
- Relative imports → use path aliases.
- Multiple Redis connections → share via `RedisCacheModule`.
- Reorder protection decorators → follow §5 exactly.
- Flat i18n keys → nested JSON.
- Log secrets (password/token/apiKey) explicitly.
- Skip session invalidation on password change/reset/logout/device removal.
- `UPPER_SNAKE_CASE` enums → PascalCase name + camelCase keys.
- Array transaction for conditional logic → callback form.
- `any` type / ignored null checks.
- `@Inject` for a repository → direct class injection.
- `undefined` past the input boundary → `null`.
- `field?: Type | null` → pick one.
- Normalize filter params in the caller → repository owns it.
- Write unit tests unprompted, or over-comment obvious code → see §7.
- Non-idiomatic NestJS (hand-rolled what Nest provides) → §7.
- Copy-paste logic / speculative params / premature abstraction → violates DRY, YAGNI, KISS.
- Skip reading `docs/*` before acting → violates §0.
