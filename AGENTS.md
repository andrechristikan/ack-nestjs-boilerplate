# ack-nestjs-boilerplate

An opinionated, production-shaped NestJS starter. It is a boilerplate: no external client depends on it, so build
the correct shape and change every call site. No compat flag, no `v1`/`v2` pair, no deprecated-but-kept field.
Four domain groups:
- identity and auth: JWT with JWKS, social sign-in, API keys, sessions, devices, two-factor
- access control: roles, CASL policy abilities, term-policy gating, feature flags
- workspace and project: mandatory multi-workspace, invites, join requests, workspace-scoped projects
- platform: notifications, file upload and S3 presign, activity log, i18n, health, country data

## Stack

NestJS, TypeScript strict, native ESM (`"type": "module"`, `module: nodenext`, `verbatimModuleSyntax`), SWC
build, Vitest with Testcontainers. Node and pnpm versions are `engines` and `packageManager` in `package.json`;
pnpm only, `npm` and `yarn` are rejected by `engines` and by the `preinstall` guard. Prisma with a MongoDB replica
set (transactions need one) and no migration files: `prisma db push` applies the schema. Redis `db:0` for cache
(`CACHE_REDIS_URL`) and `db:1` for BullMQ (`QUEUE_REDIS_URL`). Every transport shape is a zod schema, validated
by `RequestSchemaValidationPipe` on the way in and `ResponseInterceptor` on the way out; Swagger through
`zod-openapi`; nestjs-i18n from `src/languages/`; Pino logging; Sentry (`src/instrument.ts`); nest-commander
seeds (`src/migration.ts`); Vault for secrets.

## Layout

```
src/main.ts             HTTP bootstrap: Sentry, shutdown hooks, Swagger, listen
src/configure.ts        NestFactory options and configure(app): logger, prefix, trusted proxy, versioning
src/migration.ts        nest-commander entrypoint, runs seeders
src/instrument.ts       Sentry init and event scrubbing
src/swagger.ts          OpenAPI document builder
src/app/                app.module and the APP_FILTER chain
src/common/             shared module: database, cache, redis, pagination, request, response, logger, message, helper, file, doc, aws, firebase, sentry
src/configs/            registerAs config files and the index barrel
src/generated/          prisma-client/ and package/, gitignored, produced by pnpm generate
src/languages/          nestjs-i18n JSON, one file per module prefix
src/migration/          seeds: data/, seeds/, bases/, enums/, interfaces/
src/modules/            feature modules
src/queues/             BullMQ framework layer; named queues register in the owning feature module
src/router/             http/ mounts controllers under /public /system /admin /user /shared; processor/ aggregates processor modules
prisma/schema.prisma    editable; applying it is the owner's
test/unit/              unit specs mirroring src/, no Docker
test/integration/       repository and adapter specs on Testcontainers
test/e2e/               HTTP route and flow specs on Testcontainers
test/helpers/           helpers two or more test types share
docs/                   durable project documentation
scripts/                generate-secret.ts, generate-package.ts
ci/                     dockerfile.production, docker-compose.production.yml (production); mongo/, vault/, jwks-server/ (both compose files)
dockerfile              development image, the compose apis service
keys/                   generated JWT keys, encryption secret, and Mongo keyfile, gitignored
generated/              swagger, vault init, agent reports under docs/, gitignored
```

## Layering

Every feature module carries one shape: `Controller → HTTP Service → Domain → Repository`, with `Processor →
Processor Service` joining at the domain (`.claude/rules/layering.md`). Only a repository queries
`databaseService.client`, seeds and health indicators excepted (`.claude/rules/database.md`).
`src/app/app.module.ts` registers the `APP_FILTER` providers general → base-exception → http → validation →
validation-import; NestJS evaluates them in reverse, so the most specific runs first.

## Commands

- `pnpm install` · `pnpm start:dev` · `pnpm build`
- `pnpm generate`: `db:generate` (`prisma generate`) then `generate:package`. Run after a fresh checkout
  and after a `package.json` version bump. `db:generate`, `db:format` and `prisma validate` touch files only.
- `pnpm typecheck` · `pnpm test` (unit) · `pnpm test <path-filter>` · `pnpm test:cov` (unit coverage)
- `pnpm test:integration` · `pnpm test:e2e`: need a running Docker daemon; they start throwaway containers.
- `pnpm lint` · `pnpm lint:fix` · `pnpm format` · `pnpm deadcode` (knip) · `pnpm spell`
- `docker-compose up -d`: MongoDB replica set, Redis, BullBoard, JWKS server. `docker-compose --profile vault up -d`
  adds Vault, `--profile apis` the app container. Ports are in `docker-compose.yml`.

## Prisma schema

`prisma/schema.prisma` is editable. Applying it is the owner's: `pnpm db:migrate`, `pnpm db:studio`, `pnpm migration`,
`pnpm migration:seed`, `pnpm migration:remove`, `pnpm migration:fresh`, `node dist/migration.js`, `prisma db *`,
`prisma migrate *`, `prisma studio` (bare, `npx`, `pnpm exec`, `pnpm dlx`), `mongosh`, `redis-cli`. Edit the
schema, then hand back the commands the owner runs. One exception: the integration and e2e global-setup runs `prisma db push --skip-generate` on its throwaway Mongo.

## Commit gates

`.husky/pre-commit` runs lint-staged → typecheck → deadcode → spell → `NODE_ENV=test pnpm test`, whatever is staged. `.husky/commit-msg` runs commitlint against `.commitlintrc`. Both block.
