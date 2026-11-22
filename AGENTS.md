# ack-nestjs-boilerplate

An opinionated, production-shaped NestJS starter. It is a boilerplate: no external client depends on it, so replace an old shape with the best-practice shape directly and change every call site. No backward compatibility, compat flag, `v1`/`v2` pair, deprecated-but-kept field, backfill, data-migration note, or existing-rows consequence. Four domain groups:

- identity and auth: JWT with JWKS, social sign-in, API keys, sessions, devices, MFA
- access control: roles, CASL policy abilities, term-policy gating, feature flags
- workspace and project: mandatory multi-workspace, invites, join requests, workspace-scoped projects
- platform: notifications, file upload and S3 presign, activity log, i18n, health, country data

## Stack

NestJS, TypeScript strict, native ESM (`"type": "module"`, `module: nodenext`, `verbatimModuleSyntax`), SWC build, Vitest (unit; integration and e2e on Testcontainers held). Node and pnpm versions are `engines` and `packageManager` in `package.json`; pnpm only: `engines` and the `preinstall` guard reject `npm` and `yarn`. Prisma with PostgreSQL 18 and migration files under `prisma/migrations/`: `prisma migrate` applies the schema. Redis: cache (`REDIS_CACHE_URL`) and BullMQ (`REDIS_QUEUE_URL`) on separate instances. Every transport shape is a zod schema, validated by `RequestSchemaValidationPipe` on the way in and `ResponseInterceptor` on the way out; Swagger through `zod-openapi`; nestjs-i18n from `src/languages/`; Pino logging; Sentry (`src/instrument.ts`); nest-commander seeds (`src/migration.ts`); Vault for secrets.

## Layout

```
src/main.ts             HTTP entry: instrument, then bootstrapApplication
src/bootstrap.ts        bootstrapApplication (NestFactory, NODE_ENV, TZ, configure(app), Swagger, listen), bootstrapMigration, bootstrapFailed
src/configure.ts        ConfigureOptions (NestFactory options); configure(app): logger, prefix, trusted proxy, x-powered-by off, versioning
src/migration.ts        seed entry: instrument, then bootstrapMigration
src/instrument.ts       Sentry init and event scrubbing
src/swagger.ts          OpenAPI document builder
src/app/                app.module and the APP_FILTER chain
src/common/             shared module: database, cache, redis, pagination, request, response, logger, message, helper, file, doc, aws, firebase, sentry, queue, outbox
src/configs/            registerAs config files and the index barrel
src/generated/          prisma-client/ and package/, gitignored, from pnpm generate
src/languages/          nestjs-i18n JSON, one file per module prefix
src/migration/          seeds: data/, seeds/, bases/, enums/, interfaces/
src/modules/            feature modules
src/router/             http/ mounts controllers under /public /system /admin /user /shared; processor/ provides every processor and imports their use-case modules
prisma/schema.prisma    editable; the owner applies it locally, `migrate` in a release
test/unit/              unit specs mirroring src/, no Docker
test/integration/ e2e/  held, not created (.claude/rules/testing.md)
test/helpers/           helpers two or more test types share
docs/                   durable project documentation
scripts/                generate-secret.ts, generate-package.ts
ci/                     production-ready: dockerfile, docker-compose.yml, vault/; jwks-server/ (both compose files)
dockerfile              local image, the compose apis service
keys/                   generated JWT keys and encryption secret, gitignored
generated/              swagger, vault init, sweep log, gitignored
```

Propose no option a rule forbids or an entry in `.claude/decisions/` rejects unless the owner reopens it.

## Layering

Feature modules share one shape: `Controller → Use case → Service → Repository`; `Processor → Use case` for jobs (`.claude/rules/layering.md`). A service holds one module's application logic; a use case assembles services into one action's business logic; `src/modules/analytic/` aggregates analytic reads. Only a repository queries `databaseService.client`, health indicators excepted. `src/migration/` seeds write through `DatabaseService` directly (`.claude/rules/seeding.md`). `src/app/app.module.ts` registers `APP_FILTER` providers general → http → validation → validation-import; NestJS runs them reversed, most specific first.

## Discipline

Before an edit, read each rule `bash .claude/hooks/rules.sh <path>` prints. `.claude/rules/discipline.md` binds every change.

## Commands

- `pnpm install` · `pnpm start:dev` · `pnpm build`
- `pnpm generate`: `db:generate` (`prisma generate`) then `generate:package`. Run after a fresh checkout or a `package.json` version bump. `db:generate`, `db:format` and `prisma validate` touch files only.
- `pnpm typecheck` · `pnpm test` (unit) · `pnpm test <path-filter>` · `pnpm test:cov` (unit coverage)
- `pnpm lint` · `pnpm lint:fix` · `pnpm format` · `pnpm deadcode` (knip) · `pnpm spell`
- `docker compose --env-file .env.docker --profile deps up -d`: the dependencies; adding `--profile apis` the app (with `migrate` in production). `-f ci/docker-compose.yml`: a deployed environment; `--profile vault` Vault. `package.json` holds no Docker script.

## Prisma schema

A release applies the schema through `migrate`. Owner-only: `pnpm db:migrate` (applies the schema), `pnpm db:studio`, `pnpm migration*`, `prisma db|migrate|studio`, `node dist/migration.js`, `psql`, `redis-cli`. Edit the schema; hand back the commands.

## Commit gates

`.husky/pre-commit` runs `pnpm lint:staged` (format, lint, `stop-only`, related unit specs), then `pnpm typecheck`; `.husky/commit-msg` runs commitlint (`.commitlintrc`). `.github/workflows/ci.yml` runs lint, typecheck, deadcode, spell, build, a pull-request dependency review, then unit (`pnpm test:cov`) and integration workflows on pull requests and pushes to `main`, `staging`, `development`. Each blocks.
