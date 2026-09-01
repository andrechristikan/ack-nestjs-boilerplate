# ACK NestJS Boilerplate Agent Guide

This repository already carries its deepest AI instructions under `.claude/`. This file is the portable entrypoint for Codex and any other agent that looks for a root-level agent guide.

Use this file as the default contract, then read the relevant canonical rule files under `.claude/` for task-specific detail.

## Purpose

`ack-nestjs-boilerplate` is an opinionated, production-shaped NestJS starter.

- NestJS 11, TypeScript strict, Node `>= 24.11`
- PNPM only
- Prisma 6 with MongoDB 8 replica set
- Redis for cache and BullMQ
- Pino logging, Sentry instrumentation, Swagger, nest-commander migration CLI

This is a boilerplate, not a backward-compatibility product. When a design is wrong, replace it cleanly and update every call site.

## Repository Shape

Core runtime lives under `src/`:

- `src/app/`: framework layer and global filters
- `src/common/`: shared infrastructure only
- `src/configs/`: config namespaces
- `src/modules/`: feature modules
- `src/queues/`: BullMQ composition and registration
- `src/router/`: route-prefix registration
- `src/migration/`: seeders

Tests mirror `src/` under `test/`. Durable human documentation lives under `docs/`.

## Architecture

Repository pattern is mandatory:

```text
Controller -> Service -> Repository -> DatabaseService
```

- Controllers do route delegation only.
- Services hold business logic only.
- Repositories hold data-access logic only.
- Services never inject `DatabaseService`.
- Repositories inject `DatabaseService` directly.
- Feature modules stay flat, folder-per-concern. Do not invent a second layering system.
- Use path aliases only. Relative imports like `../` are defects.

Read `.claude/rules/architecture.md` before changing controllers, services, repositories, module wiring, or shared-kit placement.

## Hard Rules

- Never edit `prisma/schema.prisma`.
- Never run schema or DB mutation commands: `db:generate`, `db:migrate`, `db:push`, `migration:*`.
- Never stage, unstage, stash, or commit unless the owner explicitly asks.
- Use `pnpm` only. Do not use `npm` or `yarn`.
- Write every project artifact in English.
- Do not add backward-compatibility shims, version pairs, deprecated-but-kept fields, or bridge adapters.
- Do not edit `docs/*.md` as part of ordinary code work. If code changes make docs stale, report the drift.

## Testing

- New behavior and bug fixes require TDD: write the failing spec first, then implement.
- Coverage backfill is different: do not change production behavior just to satisfy an existing-code coverage task.
- Specs live under `test/` mirroring `src/`; never colocate specs in `src/`.
- Services, guards, pipes, interceptors, filters, DTOs, exceptions, factories, and indicators are in the coverage set.
- Controllers and repositories are not unit-test targets in this repo.

Read `.claude/rules/testing.md` before adding or changing tests.

## Workflow

Before editing:

1. Read the real files you plan to change.
2. Read the matching project docs under `docs/` for the subsystem you are touching.
3. Read the relevant canonical rules under `.claude/rules/`.

While editing:

1. Keep scope tight.
2. Preserve the repository pattern.
3. Follow existing naming and module structure.
4. Prefer small, direct changes over speculative abstractions.

Before finishing:

1. Run targeted tests for the touched scope.
2. Run `pnpm typecheck`.
3. Run `pnpm lint`.
4. Run `pnpm spell` when available for the branch workflow.

Run `pnpm test` and `pnpm start:dev` when the user wants the branch merge-ready or the change touches wiring that can fail at boot.

## Canonical Rule Library

Use these `.claude` files as the source of truth:

- `.claude/CLAUDE.md`: repo overview, ownership boundaries, workflow map
- `.claude/rules/architecture.md`: repository pattern, shared-kit rules, path aliases
- `.claude/rules/testing.md`: TDD, coverage scope, spec placement
- `.claude/rules/git.md`: git behavior, commit-message policy, diff base
- `.claude/rules/database.md`: Prisma and MongoDB rules
- `.claude/rules/authoring.md`: language, comments, where a sentence lives
- `.claude/rules/*.md`: task-specific constraints for HTTP, validation, exceptions, queues, naming, security, pagination, notifications, migrations, and feature flags
- `.claude/skills/*.md`: workflow-level procedures when the task matches one of those jobs

If another agent-specific instruction file disagrees with `.claude/rules/*.md`, treat the `.claude` rule file as authoritative and align the agent-specific file instead of inventing a third interpretation.
