# ACK NestJS Boilerplate

`ack-nestjs-boilerplate` — an opinionated, production-shaped NestJS starter. It is a
BOILERPLATE: no external client depends on it, so a breaking change is cheap and the clean
design always wins over the compatible one. Four domain groups: identity and auth (JWT with
JWKS, social sign-in, API keys, sessions, devices, two-factor), access control (roles, CASL
policy abilities, term-policy gating, feature flags), workspace and project (mandatory
multi-workspace, invites, join requests, workspace-scoped projects), and platform
(notifications, file upload and S3 presign, activity log, i18n, health, country data).

## Stack

- NestJS 11 · TypeScript strict · Node >= 24.11 · **PNPM only** — `npm` and `yarn` are
  blocked by `engines` and by a `npx only-allow pnpm` preinstall guard
- Prisma 6 + **MongoDB 8 replica set** — a replica set is required, transactions do not work
  without one. There are NO migration files: schema shape is applied by `prisma db push`
- Redis: cache on `db:0`, BullMQ on `db:1`, both through ONE shared connection
- HTTP with Swagger under the configured `doc.prefix`; request validation is `class-validator`
  through a global pipe; i18n through `nestjs-i18n` reading `src/languages/`
- Pino logging, Sentry instrumentation, nest-commander seeding CLI, Vault for secrets
- Ports: API 3000 · MongoDB 27017 · Redis 6379 · BullBoard 3010 · JWKS 3011 · Vault 8200

## Layout

Feature modules live in `src/modules/<feature>/` and all carry ONE shape — the repository
pattern, `Controller → Service → Repository`, with flat folder-per-concern directories
(`controllers/`, `services/`, `repositories/`, `dtos/request/`, `dtos/response/`, `enums/`,
`exceptions/`, `interfaces/`, `constants/`, `utils/`, and `decorators/` `docs/` `guards/`
`factories/` `indicators/` `interceptors/` `processors/` `templates/` `validations/` where the
feature needs them). There is no layered folder scheme on top of it and no second shape to
detect — do not invent one.

```
src/
├── main.ts             # HTTP bootstrap — global prefix, versioning, middleware, Swagger
├── migration.ts        # nest-commander entrypoint — boots MigrationModule, runs seeders
├── instrument.ts       # Sentry init (imported first by main.ts)
├── swagger.ts          # Swagger/OpenAPI document builder
├── app/                # framework layer — app.module + the APP_FILTER chain
├── common/             # the shared module — database, cache, redis, pagination, request,
│                       #   response, logger, message, helper, file, doc, aws, firebase
├── configs/            # registerAs config files + index.ts barrel
├── languages/          # nestjs-i18n JSON, one file per module prefix
├── migration/          # SEEDS — data/, seeds/, bases/, enums/, interfaces/
├── modules/            # feature modules (repository pattern)
├── queues/             # BullMQ framework layer + composition root
└── router/             # route prefix modules (/public /system /admin /user /shared)

prisma/schema.prisma    # OFF-LIMITS — see "How work happens here"
generated/              # prisma client, swagger, vault init, agent reports (gitignored)
docs/                   # durable project documentation
test/                   # jest.json + specs mirroring src/
scripts/ · ci/ · keys/
```

`src/app/app.module.ts` registers the `APP_FILTER` providers in array order general →
base-exception → http → validation → validation-import. NestJS evaluates them in reverse, so
the most specific catch runs first.

## Commands

- `pnpm install` · `pnpm start:dev` · `pnpm build` · `pnpm start:prod`
- `pnpm typecheck` — `tsc --noEmit`. `pnpm build` runs it too, but proves nothing on its own
- `pnpm test` — `TZ=UTC jest --config test/jest.json`; `pnpm test:cov` adds coverage
- `pnpm lint` · `pnpm lint:fix` · `pnpm format` · `pnpm deadcode` · `pnpm spell`
- `pnpm db:studio` · `pnpm vault:pull`
- `docker-compose up -d` — MongoDB replica set, Redis, BullBoard, JWKS server, Vault
- `pre-commit` runs lint-staged → typecheck → deadcode → spell → the test suite.
  `commit-msg` runs commitlint. Both are BLOCKING.

**`deadcode` and `spell` always exit 0.** `spell` ends in `|| true` and `ts-prune` never
signals. Their exit code means nothing: READ the output and report what it says.

## Skills

Never invoke, suggest, or auto-start a skill the owner has not named. A normal (cold) session
answers questions, explores, and edits code directly. Ordered end-to-end jobs live in skills,
and the owner calls them.

Project skills, in `.claude/skills/`. Each is owner-invoked only and dispatches agents:

| Skill | For |
|---|---|
| `ack-feature` | new behaviour, end to end — interrogate, plan, build spec-first, gate, all checks green |
| `ack-fix` | one narrow named change, no plan |
| `ack-fix-test` | repair or backfill unit specs against code that exists |
| `ack-debug` | find the cause of a symptom — root cause and evidence, no fix |
| `ack-seed` | initial-data seeders under `src/migration/` |
| `ack-gate` | check a scope against the rule set |
| `ack-verify` | prove something works against the running app |
| `ack-docs` | check and repair `docs/*.md` |
| `ack-pr-doc` | write the PR description document — runs alone, at the end |
| `ack-claude-config` | rework `.claude/**`, with agents and skills disabled |

The roster prints to the terminal at session start — a `SessionStart` hook derives it from
`.claude/skills/*/SKILL.md`, so adding a skill needs no second edit anywhere.

Each skill ends with a **Next** section naming what usually follows it. Nothing chains
automatically: a skill never invokes another skill, so every hop is the owner's call.

```
                     ┌─ /ack-verify ─┐
   /ack-feature ─────┤               ├──→ /ack-docs
                     └───────────────┘
                             ▲
   /ack-debug ──→ /ack-fix ──┘

   /ack-gate  ──→ /ack-fix

   /ack-seed  ──→ /ack-docs

   /ack-pr-doc          alone, at the end — it fetches and moves a local ref
   /ack-claude-config   alone — the subject is the configuration an agent would read
```

`/ack-fix` changes code, and the specs for what it changed come with it. `/ack-fix-test`
changes no `src/` at all. When a suite is red: the code is wrong → `/ack-debug` then
`/ack-fix`; the spec is wrong → `/ack-fix-test`.

Agents live in `.claude/agents/` and are dispatched BY a skill, not invoked directly:
`planner`, `coder`, `test-writer`, `seed-writer`, `explorer`, `researcher`, `reviewer-rules`,
`reviewer-e2e`, `verifier`, `doc-writer`, `pr-doc-writer`.

External skills this project relies on. They live outside the repository, so each machine
installs them once:

- `superpowers` — `claude plugin install superpowers@claude-plugins-official`. Enabling it in
  `.claude/settings.json` does not install it.
- `graphify` — a knowledge graph over the codebase, written to `graphify-out/`. Install with
  `uv tool install graphifyy`, then `graphify claude install`. Prefer
  `graphify query "<question>"` to find a file, locate code, map a flow, or find the docs
  covering it. Fall back to ordinary search when it is missing.
- `caveman` — the reply style every agent uses when reporting back. Install with
  `claude plugin marketplace add JuliusBrussee/caveman`, then
  `claude plugin install caveman@caveman`.

## How work happens here

- **`prisma/schema.prisma` is OFF-LIMITS, and so is every schema or DB command** —
  `db:migrate`, `db:push`, `db:generate`, `migration:seed`, `migration:remove`,
  `migration:fresh`. Describe the delta; the owner applies it. This is why there is no
  schema-writing agent.
- Coding rules live in `.claude/rules/`. They are NOT loaded into this session — the agent
  that needs a rule loads it.
- `docs/` is documentation written for people to read, describing how the system behaves
  today. It is tracked in git, never loaded automatically, and written only by the
  `doc-writer` agent.
- Working artifacts are gitignored: `.superpowers/` for specs and plans, `generated/docs/`
  for agent reports and PR description documents, `graphify-out/` for the knowledge graph.
- **A commit message is one conventional subject line**, `<type>(<scope>): <description>`,
  with no body and no footer — no blank line, no paragraph, no trailer, not even a co-author
  or tool trailer. Detail that does not fit the subject goes in the PR description. `type` is
  one of `build` `chore` `ci` `docs` `feat` `fix` `hotfix` `perf` `refactor` `revert` `style`
  `test`. Scope is optional but conventional here — use the module name. Imperative mood, no
  trailing period, 100 characters max. `subject-case` permits sentence / start / pascal /
  upper / lower / camel case and forbids kebab-case and snake_case. `commitlint` rejects
  anything else, so read `.commitlintrc` before proposing a message.
- **Never commit unless the owner asks for a commit in that exchange.** Finishing a task is
  not a reason to commit it, and neither is a clean tree, a green gate, or a commit the owner
  asked for one message earlier — that permission covered that commit and expired with it.
  PROPOSE the message and WAIT for approval. The work is handed back dirty; the owner reads
  the diff and decides. `git add` and `git commit` are `ask` in `.claude/settings.json`, so
  each one raises an approval prompt: the prompt is the permission system doing its job, never
  the request itself, and answering it is the owner's decision, not a formality to route
  around by widening `settings.local.json`.
- **Never touch the owner's index.** No `git add`, no `git stash`, no staging or unstaging
  command on your own. Already-staged files stay staged; unstaged stay unstaged. Stage only
  the files the owner names. Branch before committing when sitting on `main`.
- Commit through the git hooks. **`--no-verify` is not a default and is not a standing
  order**; pass it only when the owner asks for it in that exchange. A red gate is fixed, not
  skipped.
- `lint-staged` restages what `prettier --write` touches, so the index does not survive the
  hook and a granular commit series is not possible here. Say so before planning one.
- **Diff base.** Always diff with no second ref and no `..` — `git diff <base>` includes
  uncommitted and staged work, which `<base>..HEAD` silently omits. Reviewing inward (code
  review, gates, spec work) stays on the current checkout with git READ-ONLY: no fetch, no
  pull, no invented merge base. Publishing outward (a PR document) is the one exception, and
  it diffs a LOCAL `main` / `develop` ref, never `origin/*`.

## How to work here

- **No backward compatibility, ever.** No external client depends on this repo, so a breaking
  change is the default. A new feature carries no deprecated-but-kept field, no `v1`/`v2`
  pair, no compat flag, no bridging shim. Build the correct shape and change every call site.
  Best practice outranks the incumbent pattern.
- Every project artifact is ENGLISH: code, identifiers, comments, commit messages,
  `docs/*.md`, PR descriptions, and everything under `.claude/**` and `.superpowers/**`.
  Conversation with the owner is Bahasa Indonesia; artifacts are never mixed.
- When something is wrong, say so and give a recommendation. Never fix it silently, and never
  stay quiet about it.
- State the assumption you are acting on. Ask when two readings would produce different work.
- "Check", "verify" or "audit" — in any language — means the deep version: full files, traced
  callers, the schema, end to end.
- **A grep count is not a verification.** `... | grep -c 'error TS'` returns `0` when the
  command produced NO output at all — a crashed runner, a wrong binary, an ANSI-coloured
  stream — and reads exactly like success. `tsc` in particular ABORTS on a `tsconfig.json`
  config error and reports zero source errors because it type-checked nothing. Capture the
  exit code and the raw output, and sanity-check that the tool ran before quoting a count.
  `npx <pkg>@<version>` is no guarantee either: with the package present locally it silently
  runs the LOCAL binary.
- Do not re-create a deleted service or module without reading git history first.
- **Final state only, in `docs/*.md` and `.claude/**` alike.** Both trees describe how the
  project works NOW. No issue, no bug, no bug fix, no change, no decision or its reasoning, no
  rejected alternative, no date, no version, no changelog. The ban is on comparing against a
  FORMER state, not on a vocabulary — "rather than" contrasting two options a reader picks
  between today is fine. The test: would this sentence exist if the thing had
  ALWAYS been this way? If it only makes sense because something used to be different, it is
  history, and history lives in `git log`, the PR description, and the issue tracker. A negation
  is allowed when it states a CONTRACT (what a caller does not send, what a guard does not do)
  and banned when it rebuts a former state. Full rule and the rewrite table: `rules/authoring.md`.
