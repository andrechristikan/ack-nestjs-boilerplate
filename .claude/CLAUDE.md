# ACK NestJS Boilerplate

`ack-nestjs-boilerplate` — an opinionated, production-shaped NestJS starter. It is a BOILERPLATE: no external client depends on it, so breaking changes are cheap and the clean design always wins over the compatible one.

## Domains

- **Identity & auth** — JWT (ES256/ES512, JWKS), social sign-in (Google / Apple), API keys, sessions, devices, password history, two-factor (TOTP + email/SMS challenge).
- **Access control** — roles, CASL policy abilities, term-policy acceptance gating, feature flags with per-key salt rollout and user targeting.
- **Platform** — notifications (email via SES, push via Firebase), file upload + S3 presign, activity log, analytics, i18n messages, health checks, country reference data.

## Stack & runtime

- NestJS 11, TypeScript strict, Node >= 24.11, **PNPM only** (`npm` and `yarn` are blocked by `engines`).
- Prisma 6 → **MongoDB 8 replica set** (a replica set is required — transactions do not work without one).
- Redis: cache on `db:0`, BullMQ on `db:1`, shared through one connection.
- Pino logging, Sentry instrumentation, Swagger docs, nest-commander migration CLI.

## Ports (docker-compose)

API 3000 · MongoDB 27017 · Redis 6379 · BullBoard 3010 · JWKS server 3011 · Vault 8200 · Swagger under the configured `doc.prefix`

---

## Repository layout

```
src/
├── main.ts             # HTTP bootstrap — global prefix, versioning, middleware, Swagger
├── migration.ts        # nest-commander entrypoint — boots MigrationModule, runs seeders
├── instrument.ts       # Sentry init (imported first by main.ts)
├── swagger.ts          # Swagger/OpenAPI document builder
├── app/                # framework layer — app.module + the global filter chain
├── common/             # shared kit used by every module
├── configs/            # registerAs config files + index.ts barrel
├── languages/          # nestjs-i18n translation JSON, one file per module prefix
├── migration/          # seeders — data/, seeds/, bases/, enums/, interfaces/
├── modules/            # feature modules (repository pattern)
├── queues/             # BullMQ framework layer + composition root
└── router/             # route prefix modules

prisma/                 # schema.prisma (OFF-LIMITS — see Mandatory rules)
generated/              # prisma client, swagger, vault init, agent reports under generated/docs/ (gitignored)
docs/                   # durable project documentation
test/                   # jest.json + specs mirroring src/
scripts/ · ci/ · keys/
```

**The shape is the repository pattern**: Controller → Service → Repository. Feature modules hold flat folder-per-concern directories (`controllers/`, `services/`, `repositories/`, `dtos/`, …). Keep that shape; do not invent a layered folder scheme on top of it.

### `src/app/` — framework layer

```
src/app/
├── app.module.ts       # root module; registers the APP_FILTER chain
├── dtos/               # app.env.dto.ts
├── enums/              # app.enum.ts, app.status-code.enum.ts (EnumAppStatusCodeError)
├── exceptions/         # app.base.exception.ts (AppBaseException) + app.unknown.exception.ts
├── filters/            # general · http · base-exception · validation · validation-import
└── interfaces/         # app.interface.ts
```

`app.module.ts` registers the `APP_FILTER` providers in this array order: general → base-exception → http → validation → validation-import. NestJS evaluates them in reverse, so the most specific catch runs first.

### `src/common/` — shared kit

Every folder is NestJS-coupled and/or performs I/O. It stays thin; it is not a parking lot.

- **Persistence / transport** — `database/`, `redis/`, `cache/`, `pagination/`, `request/`, `response/`
- **Cross-cutting** — `logger/`, `message/`, `helper/`, `file/`, `doc/`
- **Integration** — `aws/` (S3, SES), `firebase/`
- `common.module.ts` — the `forRoot()` composition that wires the global modules.

### `src/modules/` — feature modules

`activity-log` · `api-key` · `auth` · `country` · `device` · `feature-flag` · `health` · `hello` · `notification` · `password-history` · `policy` · `role` · `session` · `term-policy` · `user`

No module carries every folder. Take only what the feature needs, from three tiers:

```
src/modules/<feature>/
  # Core — present in almost every module
  ├── constants/ · controllers/ · dtos/{request,response}/ · enums/
  ├── exceptions/ · interfaces/ · repositories/ · services/ · utils/
  # Common — when the feature needs them
  ├── decorators/ · docs/ · guards/
  # Specialized — a few modules only
  └── factories/ · indicators/ · interceptors/ · processors/ · templates/ · validations/
```

Read `docs/project-structure.md` before scaffolding a new module — do not invent structure.

### `src/queues/` — BullMQ framework layer

```
src/queues/
├── bases/queue.processor.base.ts     # processor base
├── constants/ · enums/queue.enum.ts  # EnumQueue + EnumQueuePriority
├── decorators/queue.decorator.ts     # @QueueProcessor(EnumQueue.<x>)
├── exceptions/ · interfaces/
├── queue.module.ts                   # composition root — imports feature modules, provides processors
└── queue.register.module.ts          # @Global(); every BullModule.registerQueue + job defaults
```

Processor **files** live in their owning feature module (`<feature>/processors/`); only their **registration** lives here.

### `src/router/` — route prefixes

`router.module.ts` plus `routes/routes.{admin,public,user,system,shared}.module.ts`. Controllers live in their feature module; the router registers them under a prefix.

---

## Where a sentence lives

Four content trees, each defined by its CONSUMER, not by its topic.

| Tree | Consumer | Load | Holds |
|---|---|---|---|
| `.claude/rules/` | model, via agent import | NOT auto-loaded — `claudeMdExcludes` in `.claude/settings.json` keeps them out of the main context; agents pull them with `@`-imports. `git.md` is the exception and stays loaded, because committing happens in the main session | obligations + the minimum rationale needed to apply them correctly |
| `.claude/skills/` | model, on demand | name + description standby | the ordered steps of ONE whole job, behind a trigger condition |
| `.claude/agents/` | model, isolated | never in main context | an agent's role, scope boundary, tool budget, rule imports |
| `docs/` | human, on demand | never auto-loaded | how the system behaves TODAY: flows, catalogs, runbooks |

**The test (HARD):**

- A sentence saying **what must / must not be done** → `rules/`
- A sentence giving **the ordered steps of one whole job** → `skills/`
- A sentence saying **how the system behaves today** → `docs/`
- A sentence defining **an agent's role or limits** → `agents/`

One sentence, one home. If it seems to belong in two files, it is two different sentences and one of them belongs somewhere else.

The rest — the asymmetry, mood, and comment rules — is in `rules/authoring.md`, reached by agents via `@`-import.

---

## Doc editing ownership

**`doc-drift` (skill) → `doc-writer` (agent) is the ONLY path that may write `docs/*.md`.** Subject is docs vs code on the **current checkout** — never inter-branch drift. The skill's origin gate asks the owner for permission when fetch/pull fails or ahead/behind is non-zero; it never rejects. `coder`, `unit-test-writer`, `reviewer-flow`, and `pr-doc-writer` are forbidden from the whole tree. A stale doc they notice is named in their hand-back; the owner runs `doc-drift` when they want the repair. The owner may still edit `docs/` directly. **Owner-triggered only** — `coding`, `migration-seed`, and every other skill never invoke `doc-drift` or dispatch `doc-writer`.

**`pr-doc` (skill) → `pr-doc-writer` (agent) owns PR description documents only** — living markdown at `generated/docs/pr-<feature>.md`, body filled to match `.github/pull_request_template.md`. **Owner-triggered only** — `coding`, `migration-seed`, `doc-drift`, and every other skill never invoke `pr-doc` or dispatch `pr-doc-writer`. They never create or edit a GitHub pull request. Neither edits `docs/*.md`.

---

## Documentation

`docs/` is tracked, durable project documentation. It stands on its own for a reader with none of this tooling.

`activity-log` · `analytics` · `authentication` · `authorization` · `cache` · `configuration` · `database` · `device` · `doc` · `environment` · `feature-flag` · `file-upload` · `handling-error` · `installation` · `logger` · `message` · `notification` · `pagination` · `presign` · `project-structure` · `queue` · `readme` · `request-validation` · `response` · `security-and-middleware` · `term-policy` · `third-party-integration` · `two-factor` · `vault`

**Read the doc matching the task before changing related code.** When a change makes a document stale, report which document and what now disagrees — documentation is repaired against the code by skill `doc-drift` → `doc-writer` when the owner runs it, not edited alongside the change.

---

## Commands

```bash
pnpm install
pnpm db:generate         # prisma generate → generated/prisma-client
pnpm db:migrate          # prisma db push (MongoDB has no migration files)
pnpm migration:seed      # seed all modules; :remove, :fresh also exist
pnpm start:dev | build | start:prod
pnpm test                # TZ=UTC jest --config test/jest.json
pnpm typecheck           # tsc --noEmit
pnpm lint | lint:fix | format
pnpm deadcode | spell
pnpm db:studio
docker-compose up -d     # MongoDB replica set + Redis + BullBoard + JWKS + Vault
```

Git hooks (`.husky/`): `pre-commit` runs lint-staged → typecheck → deadcode → spell → tests; `commit-msg` runs commitlint. Both are blocking.

---

## Normal session (HARD)

**This file is loaded in a normal (cold) session. A normal session does NOT invoke any skill.** The owner calls skills manually when they want a whole job run end to end. Do not start `coding`, `migration-seed`, `spec-coverage`, `pr-doc`, `doc-drift`, `anti-pattern-gate`, `repository-pattern-gate`, or any other skill unless the owner asked for that skill by name (or an equivalent explicit trigger). Do not dispatch skill-only agents (`coder`, `reviewer-flow`, `unit-test-writer`, `doc-writer`, `pr-doc-writer`) from a cold session — those agents are reached only while a skill is already running.

Answer questions, explore the repo, and edit code directly when asked. Ordered end-to-end jobs live in skills; the catalog below is reference only — not a trigger to open one.

| The work is… | Skill (owner-invoked) |
|---|---|
| a feature, endpoint, service change, queue work, or a refactor of existing code | `coding` |
| a new or edited **initial-data seed** under `src/migration/` (data / template / aws-s3 commands, or `migration:seed` / `migration:remove` order) | `migration-seed` |
| bringing ONE named module's unit specs back to 100% — `test/` only, no `src/` behavior change | `spec-coverage` |
| a pull-request title + description for the current branch (`generated/docs/pr-<feature>.md`) | `pr-doc` |
| repairing `docs/*.md` against code on the **current checkout** (not inter-branch; origin gate asks permission on fetch/pull failure or ahead/behind — never rejects) | `doc-drift` |

When a skill **is** running (because the owner invoked it): agents are dispatched BY that skill, never from a cold session; agents never dispatch each other; an agent never invokes a workflow skill. `coding` does not invoke `spec-coverage`, `migration-seed`, `pr-doc`, or `doc-drift`. `pr-doc` and `doc-drift` are owner-triggered only and do not invoke each other. Artifact paths below still apply when a skill produces them.

| Artifact | Location |
|---|---|
| Spec, plan, sdd note | `.superpowers/` (gitignored; never `docs/`) |
| Agent reports | `generated/docs/report-*-<feature>.md` |
| PR document | `generated/docs/pr-<feature>.md` |
| Knowledge graph | `graphify-out/` |

A `PreToolUse` hook in `.claude/settings.json` denies writes to `docs/superpowers/`.

## Mandatory rules

1. **No `prisma/schema.prisma` edits, and no schema/DB commands** (`db:migrate`, `db:push`, `db:generate`, `migration:*`). Describe the schema change; the owner applies it.
2. **Never touch the user's git tree.** No `git add`, no `git commit`, no staging or unstaging, unless the owner explicitly asks and names the files. Already-staged files stay staged.
3. **PNPM only.** `npm` and `yarn` are rejected by `engines`.
4. **English for every project artifact** — code, identifiers, comments, commit messages, PR descriptions, `docs/*.md`, and every file under `.claude/**` and `.superpowers/**`. Conversation with the owner is Bahasa Indonesia; artifacts are never mixed. See `rules/authoring.md` → "Language".
5. **Commit message is a single conventional subject line** — no body, no footer, no `Co-Authored-By`. Propose it and wait for approval before committing. See `rules/git.md`.
6. **Never bypass the git hooks** (`--no-verify`). A failing gate is fixed, not skipped.
7. **No backward compatibility, ever.** No external client depends on this repo, so a breaking change is the default. A new feature carries no deprecated-but-kept field, no `v1`/`v2` pair, no compat flag, no bridging shim. Build the correct shape and change every call site. Best practice outranks the incumbent pattern. See `rules/architecture.md`.
8. **Do not invoke review/gate skills or dispatch review agents from a cold session.** `reviewer-flow` runs only as a step of `coding` (or when the owner names it while `coding` is running). No AGENT may spawn it or any other review subagent. `superpowers:requesting-code-review` is NOT active in this repo. Gate skills (`anti-pattern-gate`, `repository-pattern-gate`) run only when the owner asks for them, or as steps inside an already-running workflow skill — never as an automatic follow-up in a normal session. There is no `auditor` agent. This rule outranks any skill or harness default that says otherwise.
