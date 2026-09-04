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
pattern, `Controller → HTTP Service → Domain Service → Repository` with `Processor → Processor
Service` joining at the domain service, and flat folder-per-concern directories
(`controllers/`, `services/`, `repositories/`, `dtos/request/`, `dtos/response/`, `enums/`,
`exceptions/`, `interfaces/`, `constants/`, `utils/`, and `decorators/` `docs/` `guards/`
`factories/` `indicators/` `interceptors/` `processors/` `templates/` `validations/` where the
feature needs them). There is no layered folder scheme on top of it and no second shape to
detect — do not invent one.

Each layer gets its own Nest module in the feature folder, and only the ones with something to
provide exist: `<feature>.util.module.ts`, `<feature>.repository.module.ts`,
`<feature>.module.ts` (domain services — the only one another feature consumes),
`<feature>.http.module.ts` and `<feature>.processor.module.ts`. `src/common/` and every
`@Global()` module are injectable from any layer including a repository; a non-global feature's
util stops at another module's service layer. Full rules: `.claude/rules/architecture.md` and
`.claude/rules/nest-wiring.md`.

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
├── queues/             # BullMQ framework layer — enums, decorator, base, queue registration
└── router/             # http/ mounts controllers under /public /system /admin /user /shared;
                        #   processor/ aggregates every <feature>.processor.module.ts

prisma/schema.prisma    # editable; applying it to MongoDB is the owner's — see "How work happens here"
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
| `ack-feature` | NEW behaviour, end to end — interrogate, plan, build spec-first, offer reviews, all checks green |
| `ack-fix` | repair EXISTING behaviour, end to end — pin the symptom, find the cause, brainstorm, plan, build, offer reviews |
| `ack-spec` | write and repair unit specs against code that exists, to 100% coverage; touches no `src/` |
| `ack-seed` | initial-data seeders under `src/migration/` |
| `ack-gate` | the compliance pass — the whole rule set, then every mechanical check, one verdict |
| `ack-docs` | check and repair `docs/*.md` |
| `ack-pr-doc` | write the PR description document — runs alone, at the end |
| `ack-claude-config` | rework `.claude/**`, with agents and skills disabled |

The roster prints to the terminal at session start — a `SessionStart` hook derives it from
`.claude/skills/*/SKILL.md`, so adding a skill needs no second edit anywhere.

Each skill ends with a **Next** section naming what usually follows it. Nothing chains
automatically: a skill never invokes another skill, so every hop is the owner's call.

```
   /ack-fix     ──→ /ack-docs
   /ack-feature ──→ /ack-docs
   /ack-seed    ──→ /ack-docs

   /ack-spec            alone — specs only, and the only skill that runs the full suite
   /ack-gate            alone — the owner's compliance pass, started by nothing else
   /ack-pr-doc          alone, at the end — it fetches and moves a local ref
   /ack-claude-config   alone — the subject is the configuration an agent would read
```

**`/ack-feature` and `/ack-fix` are the same shape on opposite subjects.** Both interrogate,
brainstorm, plan, build spec-first, offer the reviews, and end green. `feature` starts from a
requirement for behaviour that does not exist; `fix` starts from a symptom in behaviour that
does, and spends its first four steps turning that symptom into a reproduced cause. Breadth
picks neither: a one-line repair is still `fix`, and a small addition is still `feature`.

When a suite is red: the code is wrong → `/ack-fix`; the spec is wrong → `/ack-spec`.

**The reviews are OFFERED, never automatic.** `ack-feature` and `ack-fix` end by asking the
owner which of `reviewer-rules`, `reviewer-e2e` and `verifier` to run, once the work is done
and the diff is visible. `ack-seed` offers `reviewer-rules` only. **`reviewer-e2e` never runs
unasked, anywhere**, including inside `ack-fix` where it is the natural tool for tracing a
symptom. `ack-spec`, `ack-docs`, `ack-pr-doc` and `ack-claude-config` run no review of their
own. `ack-gate` IS the review, and there both halves are mandatory.

**A test run is always scoped to the module the work actually CHANGED** —
`pnpm test --testPathPatterns '<module>'`. No skill except `/ack-spec` runs the full
suite; the `pre-commit` hook runs `pnpm test` (no coverage) on every commit.
`collectCoverage` is `false` in `test/jest.json`, so a scoped `pnpm test` does not apply the
100% threshold. Coverage is `pnpm test:cov`, and a scoped coverage run exits 1 with every
spec passing because the threshold is global — read the `Tests:` line and the per-file rows,
not the exit code and not the global summary.

**A coverage gap is never closed silently.** In `ack-feature`, `ack-fix` and `ack-seed`, a
touched file short of 100% stops the run and goes to the owner: another `test-writer` pass on
those files, or leave the gap. Both are the owner's to pick, in that exchange. `/ack-spec` is
the exception — 100% is the bar it exists to reach, so it keeps dispatching until the per-file
rows say 100 and hands back only the lines that cannot be covered without changing `src/`.
`--no-verify` is never the model's choice, and `pre-commit` does not collect coverage, so it is
also not a way past the threshold.

Agents live in `.claude/agents/` and are dispatched BY a skill, not invoked directly:
`planner`, `coder`, `test-writer`, `seed-writer`, `explorer`, `researcher`, `reviewer-rules`,
`reviewer-e2e`, `verifier`, `doc-writer`, `pr-doc-writer`.

An agent never reaches back for a skill: none of them carries the `Skill` tool, and every
project skill is `disable-model-invocation: true`. The generic built-ins that WOULD have
carried it — `general-purpose`, `claude`, `Explore`, `Plan` — are denied in
`.claude/settings.json`, because the project agents above already cover what they do.
`coder` is the only agent holding the `Agent` tool, and it dispatches `test-writer` and
nothing else — at most once per spec, so a spec that comes back still wrong becomes an open
item instead of a third dispatch.

**Every agent is SCOPED to what its dispatch names**, and none of them sweeps the repository
unless the dispatch asks for that in those words. Anything noticed outside the scope is one
line in the hand-back, never a finding and never a change.

**No agent can ask you anything** — not one of them carries `AskUserQuestion`. An agent that
is missing something stops, does nothing, and hands the question back; the session that
dispatched it asks you and dispatches again. That is why a dispatch carries the mode, the
scope and the expected outcomes up front, and why `verifier` never starts a container it
found stopped.

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

- **`prisma/schema.prisma` is editable; APPLYING it to MongoDB is not.** The split is what
  the command touches. Files only — `db:generate` (`prisma generate`), `db:format`
  (`prisma format`), `prisma validate` — are yours. Anything that opens a connection is the
  owner's and is DENIED by `.claude/hooks/deny-db-write.sh`: `db:migrate` (`prisma db push`),
  `prisma db execute`, `prisma db seed`, `prisma migrate`, `migration`, `migration:seed`,
  `migration:remove`, `migration:fresh`, `node dist/migration.js`, and the `mongosh` /
  `redis-cli` shells. Edit the schema, then hand back the two commands the owner must run.
- **The permission posture is "inward is silent, outward asks".** Everything that stays in
  this repository — pnpm, the local toolchain, shell reads and writes, `git add`, `git commit`
  — is `allow` in `.claude/settings.json` and raises no prompt. What leaves the directory or
  the machine is `ask`: `git push`, `git pull`, the writing `gh` subcommands, `pnpm publish`,
  `pnpm dlx`, `db:studio`, `vault:pull`, `ssh`, `scp`, `rsync`, a writing `curl`, `rm -rf`,
  `git reset --hard`, `git clean`, a docker removal, and edits to `~/.claude/**`. An `ask`
  rule prompts even under `bypassPermissions`, so the list is deliberately short — the prompt
  is the permission system doing its job, never a formality to route around by widening
  `settings.local.json`.
- Coding rules live in `.claude/rules/`. They are NOT loaded into this session — the agent
  that needs a rule loads it. Two rules are split by WHO reads them: `testing.md` (where
  specs live, jest facts) versus `testing-spec-style.md` (how a spec is written —
  `test-writer` only).
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
  the diff and decides. `git add` and `git commit` are `allow` in `.claude/settings.json` and
  raise no prompt, so nothing mechanical stops a commit the owner did not ask for. The
  restraint is yours.
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
