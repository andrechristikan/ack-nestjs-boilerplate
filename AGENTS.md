# ACK NestJS Boilerplate Agent Guide

This repository carries its canonical AI operating contract under `.claude/`. This file is the
portable entrypoint for Codex and any agent that looks for a root-level guide.

Use this file to orient, then read `.claude/CLAUDE.md` and `.claude/rules/orientation.md`
before deciding where work belongs or which rule files bind it. When this file and a
`.claude/**` instruction disagree, `.claude/**` is authoritative and this file should be
aligned to it.

## Purpose

`ack-nestjs-boilerplate` is an opinionated, production-shaped NestJS starter. It is a
boilerplate: no external client depends on it, so the clean design wins over compatibility.

- NestJS 12, TypeScript strict, Node `>= 24.11`, PNPM `>= 10.25`, pinned to `pnpm@11.25.0`
- PNPM only. `npm` and `yarn` are blocked by engines and the preinstall guard.
- Prisma 6 with MongoDB 8 replica set. MongoDB transactions require the replica set.
- Redis for cache and BullMQ, with separate cache and queue Redis URLs.
- HTTP transport uses zod schemas with global request validation and response serialization.
- Pino logging, Sentry instrumentation, Swagger, Vault, and nest-commander seeding CLI.

## Repository Shape

Core runtime lives under `src/`:

- `src/app/`: framework layer and global filters
- `src/common/`: shared kit and global infrastructure only
- `src/configs/`: `registerAs` config namespaces and config barrel
- `src/languages/`: i18n JSON files
- `src/migration/`: initial-data seeders
- `src/modules/`: feature modules
- `src/queues/`: BullMQ framework composition and queue registration
- `src/router/`: HTTP and processor route/module aggregation

Tests mirror `src/` under `test/`. Durable human documentation lives under `docs/` and the
root `README.md`. Working artifacts are gitignored under `.superpowers/`, `generated/docs/`,
and `graphify-out/`.

## Architecture

The repository pattern is mandatory:

```text
Controller -> HTTP Service -> Domain Service -> Repository -> DatabaseService
Processor  -> Processor Service -----------^
```

- Controllers delegate one route to one HTTP service method.
- HTTP services translate request DTOs into domain calls and domain results into response DTOs.
- Domain services hold business rules and orchestration.
- Processor services translate queue jobs into domain calls.
- Repositories hold data access, Prisma query shape, transactions, and `null -> {}` filter normalization.
- Services never inject `DatabaseService`; repositories inject `DatabaseService` directly.
- Feature modules stay flat, folder-per-concern. Do not invent another layering scheme.
- Services have `I*Service` header interfaces and still inject by class. Repositories, utils, and queue classes do not get header interfaces.
- Use path aliases only. Relative imports like `../` are defects.

Read `.claude/rules/architecture.md`, `.claude/rules/nest-wiring.md`, and any surface-specific
rule named by `.claude/rules/orientation.md` before changing layer placement, module wiring,
controllers, services, repositories, processors, utils, queues, or shared kit.

## Rule Routing

`.claude/rules/orientation.md` is the routing map. Every source task reads these six rules:

- `.claude/rules/architecture.md`
- `.claude/rules/naming.md`
- `.claude/rules/case-convention.md`
- `.claude/rules/code-style.md`
- `.claude/rules/comments.md`
- `.claude/rules/null-safety.md`

Then read the rows from `orientation.md` for the surfaces touched: database, Prisma schema,
HTTP, router, security, validation, DTOs, Swagger, pagination, exceptions, status codes, enums,
queues, notifications, files, feature flags, i18n, config, cache, logging, seeding, specs,
docs, or `.claude/**`.

When finding code or mapping an unfamiliar flow, prefer `graphify query "<question>"` before a
broad search. Scope searches to the tree in hand; `.claude/worktrees/` can contain other
branches and is never evidence about the current checkout.

## Hard Boundaries

- Do not add backward-compatibility shims, version pairs, deprecated-but-kept fields, or bridge adapters.
- Use `pnpm` only. Do not use `npm` or `yarn`.
- Write every project artifact in English.
- Do not stage, unstage, stash, or commit unless the owner asks in that exchange.
- Do not run schema or database mutation commands that open a connection.
- Do not edit `docs/*.md` or `README.md` as part of ordinary code work. Use the docs workflow
  when the owner asks for documentation repair.
- Do not silently fix unrelated defects. Report them with file and line.

## Prisma And Database

`prisma/schema.prisma` is editable. Applying it to MongoDB is owner-only.

Agent-owned file-only commands:

- `pnpm db:generate`
- `pnpm db:format`
- `prisma validate`

Owner-owned DB commands:

- `pnpm db:migrate`
- `prisma db execute`
- `prisma db seed`
- `prisma migrate`
- `pnpm migration`
- `pnpm migration:seed`
- `pnpm migration:remove`
- `pnpm migration:fresh`
- `node dist/migration.js`
- `mongosh`
- `redis-cli`
- `pnpm db:studio`

There are no migration files for MongoDB. A schema change is a schema edit, generated client
refresh, and owner-applied push. After a schema edit, hand back `pnpm db:migrate` as the
owner's step and state the data consequence, affected indexes or unique constraints, and any
runtime surface that depends on the unapplied schema.

## Testing

New behavior and bug fixes require TDD: write the failing unit spec first, watch it fail, then
implement. Coverage backfill against existing code does not change `src/`.

- Specs live under `test/`, mirroring `src/`; never colocate specs in `src/`.
- `test/jest.json` is the only Jest config.
- Scoped test runs use `pnpm test --testPathPatterns '<module-or-path>'`; the flag is plural.
- `pnpm test` does not collect coverage and does not apply the 100% threshold.
- `pnpm test:cov` collects coverage; scoped coverage exits can be misleading because the
  threshold is global, so read the per-file rows.
- Controllers and repositories are not unit-test targets in this repo.
- Covered suffixes include services, pipes, guards, strategies, interceptors, DTOs, decorators,
  exceptions, filters, middlewares, indicators, and factories.

Read `.claude/rules/testing.md` before adding, moving, or running specs. Read
`.claude/rules/testing-spec-style.md` before writing or repairing specs.

## Workflow

Before editing:

1. Read the real files you plan to change.
2. Read `.claude/rules/orientation.md`.
3. Read the matching project docs when the subsystem has durable docs.
4. Read every canonical rule file named by the orientation map for the touched surfaces.

While editing:

1. Keep scope tight.
2. Preserve the repository pattern and import tiers.
3. Follow existing naming, folder, and module shape.
4. Prefer small direct changes over speculative abstraction.

Before finishing code work:

1. Run targeted tests for the touched scope.
2. Run `pnpm typecheck`.
3. Run `pnpm lint`.
4. Run `pnpm spell` when branch workflow expects it.

Run `pnpm test` and `pnpm start:dev` when the owner asks for merge-ready confidence or the
change touches wiring that can fail at boot. `pnpm deadcode` and `pnpm spell` always exit 0 in
normal scripts, so read and report their output instead of trusting the status code.

## Git

Git rules live in `.claude/CLAUDE.md`.

- Never commit unless the owner asks for a commit in the current exchange.
- Never touch the owner's index unless the owner names the files to stage.
- Commit messages are one conventional subject line only:
  `<type>(<scope>): <description>`.
- For inward review, keep git read-only: no fetch, pull, staging, stashing, or invented merge base.
- For diffs against a base, use `git diff <base>` with no second ref and no `..`, so staged and
  unstaged work stay visible.
- Non-code commits touching neither `src/` nor `test/` use `--no-verify`; code commits run the hooks.

## Project Skills

Project skills live in `.claude/skills/` and are owner-invoked only. Do not auto-start,
suggest, or chain one unless the owner names it.

- `ack-feature`: new behavior end to end, with requirement interrogation, spec, plan, TDD build, checks, and offered reviews.
- `ack-fix`: repair existing behavior, starting from symptom and cause, then spec, plan, TDD repair, checks, and offered reviews.
- `ack-spec`: write or repair unit specs against existing code until coverage reaches 100%; touches no `src/`.
- `ack-seed`: create or edit initial-data seeders under `src/migration/`.
- `ack-gate`: compliance pass over a named scope; reports and never fixes.
- `ack-docs`: verify and repair `docs/*.md` and the root `README.md`.
- `ack-pr-doc`: write the PR description document under `generated/docs/`; never creates or mutates a GitHub PR.
- `ack-claude-config`: rework `.claude/**`; agents and other skills are disabled for that work.

Agents live in `.claude/agents/` and are dispatched by those project skills, not invoked
directly as a replacement for the skill flow.

## Canonical Library

Use these `.claude` files as the source of truth:

- `.claude/CLAUDE.md`: repository overview, stack, workflow, skills, git behavior, ownership boundaries
- `.claude/rules/orientation.md`: rule routing map and code-finding protocol
- `.claude/rules/architecture.md`: repository pattern, import tiers, service interfaces
- `.claude/rules/nest-wiring.md`: Nest module structure and providers
- `.claude/rules/database.md`: DatabaseService, Prisma access, queries, transactions
- `.claude/rules/prisma-schema.md`: schema edit and owner push rules
- `.claude/rules/testing.md`: spec placement, Jest facts, TDD boundaries
- `.claude/rules/testing-spec-style.md`: spec writing style
- `.claude/rules/authoring.md`: artifact language, final-state prose, docs and `.claude/**` writing
- `.claude/rules/*.md`: surface-specific constraints for the code or artifact being touched
- `.claude/skills/*.md`: owner-invoked workflow procedures
