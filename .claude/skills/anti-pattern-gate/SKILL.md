---
name: anti-pattern-gate
description: Pre-finalize review gate for ack-nestjs-boilerplate feature code — an index that maps a visible code smell to the project rule it violates. Use this before declaring ANY code change done, complete, ready, or ready-to-commit, and whenever reviewing a diff, a PR, or code you did not write yourself. Also use it when something in the code "feels off" but you cannot name which rule it breaks. It indexes smells to rules; it never restates the rules themselves.
---

# Anti-pattern gate

This is the last pass before code is called done. Its job is recognition, not adjudication: it lists smells you can SEE in a diff and points at the rule file that decides what to do about each one.

**It deliberately holds no rule text.** Every entry is a pointer. Rules live in exactly one place — the file named in the right-hand column — because a smell index that also restates rules becomes a second source of truth, and the two drift apart silently. When an entry fires, open the named file and read the section before acting. Acting on an index row alone is how a rule gets applied wrong.

## How to run the gate

1. Get the diff of what you changed **inside the surface you were given**. Prefer, in order: the SCOPE paths from the skill (when present), then dirty files on this checkout (`git status --short`, `git diff -- <paths>`, `git diff --cached -- <paths>`). **Do not** invent a surface with `git diff main` / `git diff origin/...` / `git diff development` when a skill already handed you SCOPE — those compare other branches and fight `coding` / `reviewer-flow`. Outside a scoped skill run, still prefer path-limited diffs over a whole-branch base.
2. Walk the sections below that match what the diff touched. Skip sections with no touched files.
3. For each smell you recognize, **read the canonical rule** in the file named beside it. Decide there, not here.
4. Fix, or state explicitly why the rule does not apply. A hit you cannot justify is a defect, not a judgement call.
5. Report what fired and what you did. Silence about a hit reads as "clean" and is worse than a fix you did not make.

Two things to keep in mind while scanning. First, the smell list is not exhaustive — it catches the failures that actually recur here, so an absence of hits is not proof of correctness. Second, several of these fail only at RUNTIME (missing `@Expose`, route-param mismatch, queue payload rename, i18n key typo); `tsc` staying green means nothing for that class.

When the diff touches controllers, services, repositories, or module wiring, also run `repository-pattern-gate` — that skill holds placement order and traps; this index only flags the visible smells.

---

## Layering / architecture — `rules/architecture.md`

| Smell | Canonical rule |
|---|---|
| A service injecting `DatabaseService` | Repository pattern — `rules/architecture.md` |
| A service building a Prisma `where` / `select` / `orderBy` | Repository pattern — `rules/architecture.md` |
| A repository throwing a module exception, or building an i18n `messagePath` | Repository pattern — `rules/architecture.md` |
| A controller reaching a repository, or holding a business rule | Controller role — `rules/architecture.md` |
| A new `I<Xxx>Service` missing beside its service class, or a service that does not `implements` it | Service interface required — `rules/operational.md` |
| A new `I<Xxx>Repository` header beside its only repository class | Repository interface forbidden — `rules/operational.md` |
| `@Inject(TOKEN)` used for a repository instead of direct class injection | Service role — `rules/architecture.md` |
| Filter params normalized (`?? {}`) in the service instead of the repository | Repository role — `rules/architecture.md` |
| A relative import (`../`) anywhere in `src/` | Path aliases — `rules/architecture.md` |
| `forwardRef` between two feature modules | Module wiring — `rules/architecture.md` |
| A second Redis connection created outside the shared cache/queue modules | Module wiring — `rules/architecture.md` |
| A layered folder scheme invented inside a feature module instead of the flat folder-per-concern set | Module wiring — `rules/architecture.md` |
| A controller or processor registered as a provider of its own feature module instead of router / `queue.module` | Module wiring — `rules/architecture.md` |
| A shape with a clear owner module promoted into `src/common/` because "many modules import it" | Placement — `rules/architecture.md` |
| `src/common/` importing a feature's runtime code, or binding a feature type as a generic default | Placement — `rules/architecture.md` |
| A config key with a single hardcoded value; an abstract base with one subclass; a folder kept empty "for later"; a family with no used member | YAGNI — `rules/architecture.md` |
| A new family member bought by adding an abstract base, a DI token, a config knob, or an `if (type === 'x')` branch | Complexity, not breadth — `rules/architecture.md` |
| **NOT a smell:** an exported, fully-implemented primitive with zero call sites whose family has a used member (`PaginationQueryFilterNotEqual`, `DocAllOf`, `@RequestThrottleByUser`) — new or old — or anything `pnpm deadcode` lists | Kit surface — `rules/architecture.md` |
| Copy-pasted logic in two services instead of one shared helper | DRY — `rules/architecture.md` |

## Strict nulls / types — `rules/null-safety.md`

| Smell | Canonical rule |
|---|---|
| `field?: Type \| null` on any declaration | `rules/null-safety.md` |
| `undefined` accepted by a service or repository signature | Input boundary — `rules/null-safety.md` |
| A controller passing `dto.x` straight through without `?? null` | The controller is the normalizer — `rules/null-safety.md` |
| `any` as a param, cast, or generic argument | `rules/null-safety.md` |
| A non-null `!` covering a value that can genuinely be null | `rules/null-safety.md` |
| An `as` cast used to silence a null mismatch across a boundary | `rules/null-safety.md` |
| A config interface field typed `field?: Type` instead of `Type \| null` | Layer table — `rules/null-safety.md` |

## Naming — `rules/naming.md`

| Smell | Canonical rule |
|---|---|
| A file missing its `<module>.` prefix, or using a dash where the module separator belongs | File naming — `rules/naming.md` |
| A role suffix outside the closed list, or a DTO file not ending `.dto.ts` | File naming — `rules/naming.md` |
| `UPPER_SNAKE_CASE` on an enum name, key, or value | Enums — `rules/naming.md` |
| An enum without the `Enum` prefix, or more than one enum concern in a file | Enums — `rules/naming.md` |
| `UPPER_SNAKE_CASE` or `camelCase` on a constant | Constants — `rules/naming.md` |
| A type, interface, or payload shape declared without the `I` prefix | Identifiers — `rules/naming.md` |
| A payload interface named kind-before-action (`INotificationPayloadSendPush`) | Identifiers — `rules/naming.md` |
| A DTO class or file missing the `Dto` suffix on either half | Identifiers — `rules/naming.md` |
| `snake_case` introduced on any field, param, or query param | Case convention — `rules/naming.md` |
| A queue name, job name, job payload field, JWT field, cursor field, or i18n key renamed with no deploy step named | Renames that strand live runtime state — `rules/naming.md` |
| A worse name kept "for compatibility", or a rename avoided because a client might break | Everything is renameable — `rules/naming.md` |
| An inline object type restating a shape that already has a named type (a structural subset counts) | Never mirror — `rules/naming.md` |

## Exceptions / status codes / i18n — `rules/exceptions.md`

| Smell | Canonical rule |
|---|---|
| `throw new Error(...)` from feature code | Throwing rules — `rules/exceptions.md` |
| A NestJS `BadRequestException` / `NotFoundException` / `ForbiddenException` thrown by a service or guard | Throwing rules — `rules/exceptions.md` |
| More than one exception class in a file, or a barrel of exceptions | One per file — `rules/exceptions.md` |
| A numeric literal used as `statusCode` instead of the enum member | Status codes — `rules/exceptions.md` |
| `statusCodeKey` hardcoded as a string instead of the reverse lookup | Status codes — `rules/exceptions.md` |
| A new status-code member or block claimed without following `rules/status-code.md` (5-digit new codes; claim noted in `generated/docs/report-coder-*.md`) | Status codes — `rules/status-code.md` |
| A gap left in a module's status-code sequence, or a member removed without accounting for the shift | Status codes — `rules/status-code.md` |
| A flat i18n key (`"error.notFound": "..."`) instead of nested JSON | i18n — `rules/exceptions.md` |
| A `messagePath` with no matching key in `src/languages/*` | i18n — `rules/exceptions.md` |
| A controller catching a module exception and reshaping it | Throwing rules — `rules/exceptions.md` |
| An error message string asserted in a spec instead of the exception class | `rules/testing.md` |

## HTTP / controllers / docs — `rules/http.md`

| Smell | Canonical rule |
|---|---|
| A protection decorator stack in any order other than the canonical one | Decorator order — `rules/http.md` |
| `@ActivityLog` without `@AuthJwtAccessProtected` above it | Decorator order — `rules/http.md` |
| A bare `@UseGuards(...)` where a `@<Feature>Protected()` decorator is the convention | Guards — `rules/http.md` |
| A guard resolving an entity and deciding a business rule inline | Guards — `rules/http.md` |
| A credential assigned onto `request.<field>` by a guard | Guards — `rules/http.md`, `rules/security.md` |
| A 2FA, account-state, or ownership check written in a controller | Controllers — `rules/http.md` |
| A controller assembling pagination metadata by hand | Controllers — `rules/http.md` |
| A bare `:id` route param, or a param name disagreeing across route / `@Param` / doc constant | Route params — `rules/http.md` |
| A body field duplicating a path param | Route params — `rules/http.md` |
| A `@Response` route whose handler returns a bare DTO instead of `IResponseReturn<T>` | Responses — `rules/http.md` |
| A literal message string passed to `@Response()` instead of an i18n path | Responses — `rules/http.md` |
| An endpoint with no matching `*.doc.ts` factory | Swagger docs — `rules/http.md` |
| An inline `@ApiQuery` / `@ApiParam` array literal inside a doc call | Swagger docs — `rules/http.md` |
| Method JSDoc on a service / repository / controller / seed handler | Comments — `rules/authoring.md` |
| A line comment that is not `// @note:`, `// TODO`, or `// FIXME` | Comments — `rules/authoring.md` |
| A `// @note` without the colon, or one that narrates WHAT / defends a rule | Comments — `rules/authoring.md` |

## DTOs / validation — `rules/validation.md`

| Smell | Canonical rule |
|---|---|
| A response DTO field without `@Expose()` | `@Expose` is load-bearing — `rules/validation.md` |
| A nested DTO or array-of-DTO field without `@Type(() => X)` | `rules/validation.md` |
| `excludeExtraneousValues` overridden, or a raw `plainToInstance` bypassing `ResponseUtil` | `rules/validation.md` |
| An inherited field hidden with `@Exclude()` but no `@ApiHideProperty()` (or the reverse) | `rules/validation.md` |
| A request DTO field with no `class-validator` decorator | Request DTOs — `rules/validation.md` |
| A request DTO field with no `@ApiProperty` | Request DTOs — `rules/validation.md` |
| An inline regex duplicating an existing validator in `src/common/request/validations/` | Request DTOs — `rules/validation.md` |
| Input normalization (`toLowerCase`, `trim`) done in the service instead of `@Transform` | Request DTOs — `rules/validation.md` |

## Pagination — `rules/pagination.md`

| Smell | Canonical rule |
|---|---|
| `PaginationService` injected into a service or controller instead of a repository | Where it runs — `rules/pagination.md` |
| In-memory pagination — `.slice()` over a preloaded array, or filtering after `findMany()` | Database-level only — `rules/pagination.md` |
| Hand-parsed `@Query('page')` / `@Query('perPage')` instead of the pagination decorators | Controller side — `rules/pagination.md` |
| `availableSearch` / `availableOrderBy` inlined instead of a module constant, or omitted entirely | Allow-lists — `rules/pagination.md` |
| A filter typed `Record<string, any>`, a raw `filter?: string`, or `JSON.parse(rawFilter)` into `where` | Filter shape — `rules/pagination.md` |
| `per_page` anywhere | Naming — `rules/pagination.md` |
| A cursor payload field renamed with no migration window | Cursor contract — `rules/pagination.md` |

## Database — `rules/database.md`

| Smell | Canonical rule |
|---|---|
| `PrismaClient` injected directly instead of `DatabaseService` | Access — `rules/database.md` |
| `$queryRaw` / `$executeRaw` in a feature repository | Queries — `rules/database.md` |
| An inline `select` object instead of a module select constant | Queries — `rules/database.md` |
| Near-duplicate repository methods per variant instead of one method with a discriminator | Queries — `rules/database.md` |
| Array-form `$transaction` used for work with conditional logic or a read between writes | Transactions — `rules/database.md` |
| A transaction opened in a service | Transactions — `rules/database.md` |
| An edit to `prisma/schema.prisma`, or a `db:*` / `migration:*` command run | Schema is off-limits — `rules/database.md` |
| A Prisma-owned enum re-declared locally in a module | Schema is off-limits — `rules/database.md` |
| A raw `new Date()` in business logic instead of the date helper | Dates — `rules/database.md` |

## Queues — `rules/queue.md`

| Smell | Canonical rule |
|---|---|
| A processor extending `WorkerHost` directly instead of `QueueProcessorBase` | Writing a processor — `rules/queue.md` |
| A processor returning an ad-hoc shape instead of `IQueueResponse` | Writing a processor — `rules/queue.md` |
| Real work done inline in the `job.name` switch instead of a `*.processor.service.ts` | Writing a processor — `rules/queue.md` |
| `BullModule.registerQueue` called outside `queue.register.module.ts` | Where things live — `rules/queue.md` |
| A `processors/` folder under `src/queues/` | Where things live — `rules/queue.md` |
| A raw priority number instead of an `EnumQueuePriority` member | Enqueuing — `rules/queue.md` |
| A controller enqueuing a job directly | Enqueuing — `rules/queue.md` |
| A job payload field renamed with no queue drain planned | Payloads — `rules/queue.md` |
| A job AND an event emitted for the same moment | Enqueuing — `rules/queue.md` |

## Security — `rules/security.md`

| Smell | Canonical rule |
|---|---|
| A password hash, 2FA secret, token, or API secret in a log line or a `JSON.stringify` | Credentials — `rules/security.md` |
| A credential in activity-log metadata | Activity log — `rules/security.md` |
| A credential passed inside a payload object instead of as an explicit value | Credentials — `rules/security.md` |
| No session invalidation on password change, reset, logout, device removal, or role change | Session invalidation — `rules/security.md` |
| A hand-rolled ability check duplicating `@PolicyAbilityProtected` | Authorization — `rules/security.md` |
| Activity-log metadata returned in the response shape | Activity log — `rules/security.md` |
| A new per-module CLS store instead of a key on the shared `RequestStoreService` | Request store — `rules/security.md` |
| Geo-location or user-agent re-parsed downstream instead of read from the request store | Request store — `rules/security.md` |

## Migration seeds — `rules/migration.md`

| Smell | Canonical rule |
|---|---|
| A seed without a matching `remove()`, or extending `CommandRunner` directly | Anatomy — `rules/migration.md` |
| Blind `create` with no existence guard / upsert | Idempotency — `rules/migration.md` |
| Bundled seed added to only one of `migration:seed` / `migration:remove` | Order — `rules/migration.md` |
| An agent running `migration:*` / `db:*` / `migration:fresh` | Off-limits — `rules/migration.md` |

## Style / comments / config — `rules/authoring.md` + `rules/operational.md`

| Smell | Canonical rule |
|---|---|
| A comment explaining a cast, an obvious call, or what the next line does | Comments — `rules/authoring.md` |
| A trailing `//` comment to the right of code | Comments — `rules/authoring.md` |
| Method JSDoc on internal code, or JSDoc with `@param` / `@returns` / `@example` / `@throws` | Comments — `rules/authoring.md` |
| JSDoc on an interface, including a per-field comment | Comments — `rules/authoring.md` |
| An existing rule-compliant comment deleted or rephrased during a refactor | Comments — `rules/authoring.md` |
| `logger.error('message', error)` — message first | Logging — `rules/operational.md` |
| `process.env` read directly in feature code | Config — `rules/operational.md` |
| A new env var added without the config file, interface, `.env.example`, and `docs/environment.md` | Config — `rules/operational.md` |
| A hand-rolled substitute for something Nest already provides | NestJS idiomatic — `rules/operational.md` |
| An em-dash (`—`) in `docs/*.md` prose | Documentation prose — `rules/operational.md` |

## Tests — `rules/testing.md`

| Smell | Canonical rule |
|---|---|
| A spec colocated in `src/` instead of mirrored under `test/` | Where specs live — `rules/testing.md` |
| Production code changed to make a backfill spec pass (`spec-coverage`) | Hard boundaries — `rules/testing.md` (under `coding`, red→green `src/` changes are required) |
| A failing spec deleted, `.skip`-ed, or weakened to reach green | Hard boundaries — `rules/testing.md` |
| The coverage threshold lowered, or a file excluded from `collectCoverageFrom` | Hard boundaries — `rules/testing.md` |
| 100% coverage reached with happy paths only, every guard clause untested | What is covered — `rules/testing.md` |
| A new spec added for a controller or repository | What is covered — `rules/testing.md` |
| Feature TDD delegated to `unit-test-writer` / `spec-coverage` instead of `coder` writing the failing spec first | Hard boundaries — `rules/testing.md` |
| `jest.mock()` placed before imports | Local jest facts — `rules/testing.md` |
| A shared mutable fixture across specs | Writing the spec — `rules/testing.md` |

## Git — `rules/git.md`

| Smell | Canonical rule |
|---|---|
| A commit or stage performed without the owner asking | Never touch the tree — `rules/git.md` |
| A commit message with a body, a footer, or a `Co-Authored-By` trailer | Commit message — `rules/git.md` |
| A commit type outside the `.commitlintrc` enum | Commit message — `rules/git.md` |
| `--no-verify` used to get past a failing hook | Workflow — `rules/git.md` |

---

## After the gate

Run the mechanical checks the index cannot see:

```bash
pnpm typecheck
pnpm lint
pnpm spell
pnpm test --testPathPatterns <your scope>
```

Then, for anything that touched module `imports:` or DI wiring, confirm the app still boots (`pnpm start:dev`). A DI or import cycle surfaces at BOOT, never at `tsc` or jest — that check is the gate, not a formality.
