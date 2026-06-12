# ACK NestJS Boilerplate — Claude Code Instructions

> Read this file top to bottom. It is an execution order: §0 before you act → §1 guardrails → §2–8 while you code → §9 before you finish → §10 is the reject list. Rules only — all domain detail lives in `docs/*`.

**Stack:** NestJS v11 · TypeScript strict · Prisma → MongoDB (replica set) · Redis (cache `db:0` / BullMQ `db:1`) · PNPM only · Node ≥ 24.11 · JWT ES256/ES512 · Repository pattern.

---

## 0. BEFORE YOU ACT (HARD — every task, no exception)

Run these steps in order before writing code, suggesting a change, or answering a design question:

1. **Scan `docs/*`.** List `docs/` and READ every doc relevant to the task. Detail is there, not here.
2. **Read the real source.** Open the actual files. Never assume structure, signatures, or names.
3. **Scope it.** Do only what is asked (YAGNI). If unsure, ASK — do not guess and build.
4. **Plan against §2–8.** Confirm the change obeys the principles and rules below before typing.

### Docs index (`/docs`)
`authentication` · `authorization` · `database` · `device` · `two-factor` · `activity-log` · `cache` · `queue` · `notification` · `response` · `request-validation` · `handling-error` · `message` · `pagination` · `file-upload` · `presign` · `feature-flag` · `term-policy` · `security-and-middleware` · `third-party-integration` · `logger` · `configuration` · `environment` · `installation` · `project-structure` · `doc` · `analytics`

When in doubt about a behavior, the matching doc is the source of truth. Read it before touching the code.

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

| Type | Rule | Example |
|---|---|---|
| Class | PascalCase | `UserService` |
| Interface | `I` + PascalCase | `IUserService` |
| Enum name | `Enum` + PascalCase | `EnumUserStatus` |
| Enum keys/values | camelCase | `active` |
| Constants | PascalCase | `MaxAttempt` |
| Files | kebab-case | `user.service.ts` |
| Methods/vars | camelCase | `findById` |
| Request DTO | `*RequestDto` suffix | `CreateUserRequestDto` |
| Response DTO | `*ResponseDto` suffix | `UserResponseDto` |

- Enums: `Enum` prefix, camelCase keys, one enum concern per file.
- Error-code enums use numeric values.

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
- `@ActivityLog` requires `@AuthJwtAccessProtected`, logs successful requests only, never logs secrets.

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
- **Minimal comments.** Code self-documents. Comment only the non-obvious or the genuinely important (a tricky invariant, a security reason, a deliberate deviation). No narrating obvious code.
- **Notes** — mark with `// @note <text>`. If the symbol already has a JSDoc block, put the note inside it instead — do not add a separate `// @note`.
- **JSDoc** — terse and to the point. State what matters, skip filler. Do not restate the signature or types the code already shows.
- **No em-dash in `docs/*.md` prose.** Never use `—` in documentation prose. Use proper punctuation instead (period, comma, semicolon, colon, or parentheses). Plain hyphens in compound words (`dev-mode`, `in-memory`) are fine; do not overuse them. Exception: an existing structured list whose every entry already uses `—` as a separator — match it for consistency rather than breaking the pattern on one line.

---

## 8. ERRORS · RESPONSES · CONFIG (rules; detail in docs)

- **Errors** — throw Nest exceptions with `{ statusCode, message: '<i18n.key>', messageProperties?, data? }`. i18n keys are nested JSON, filename = prefix (`user.error.notFound` → `languages/en/user.json`). → `docs/handling-error.md`, `docs/message.md`.
- **Responses** — use `@Response` / `@ResponsePaging`. Return `{ data, metadata?, metadataActivityLog? }`. → `docs/response.md`.
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
