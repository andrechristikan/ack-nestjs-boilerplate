# ack-nestjs-boilerplate

An opinionated, production-shaped NestJS starter. It is a boilerplate: no external client
depends on it, so build the correct shape and change every call site. No compat flag, no
`v1`/`v2` pair, no deprecated-but-kept field.

Four domain groups:
- identity and auth: JWT with JWKS, social sign-in, API keys, sessions, devices, two-factor
- access control: roles, CASL policy abilities, term-policy gating, feature flags
- workspace and project: mandatory multi-workspace, invites, join requests, workspace-scoped projects
- platform: notifications, file upload and S3 presign, activity log, i18n, health, country data

## Stack

NestJS, TypeScript strict, native ESM (`"type": "module"`, `module: nodenext`,
`verbatimModuleSyntax`), SWC build, Vitest. Node and pnpm versions are `engines` and
`packageManager` in `package.json`; pnpm only, `npm` and `yarn` are rejected by `engines` and
by the `preinstall` guard. Prisma with a MongoDB replica set (transactions need one) and no
migration files: `prisma db push` applies the schema. Redis `db:0` for cache
(`CACHE_REDIS_URL`) and `db:1` for BullMQ (`QUEUE_REDIS_URL`). Every transport shape is a zod
schema, validated by `RequestSchemaValidationPipe` on the way in and `ResponseInterceptor` on
the way out; Swagger through `zod-openapi`; nestjs-i18n from `src/languages/`; Pino logging;
Sentry (`src/instrument.ts`); nest-commander seeds (`src/migration.ts`); Vault for secrets.

## Layout

```
src/main.ts             HTTP bootstrap: global prefix, versioning, trusted proxy, Swagger
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
test/                   unit specs mirroring src/, collected by vitest.config.ts
docs/                   durable project documentation
scripts/                generate-secret.ts, generate-package.ts
ci/                     dockerfiles, vault, jwks-server
keys/                   generated JWT keys and encryption secret, gitignored
generated/              swagger, vault init, agent reports under docs/, gitignored
```

## Layering

Every feature module carries one shape: `Controller → HTTP Service → Domain → Repository`,
with `Processor → Processor Service` joining at the domain. Only a repository queries
`databaseService.client`. Rules: `.claude/rules/layering.md`.

`src/app/app.module.ts` registers the `APP_FILTER` providers general → base-exception →
http → validation → validation-import; NestJS evaluates them in reverse, so the most
specific runs first.

## Commands

- `pnpm install` · `pnpm start:dev` · `pnpm build`
- `pnpm generate`: `db:generate` (`prisma generate`) then `generate:package`. Run after a
  fresh checkout and after a `package.json` version bump. `db:generate`, `db:format` and
  `prisma validate` touch files only.
- `pnpm typecheck` · `pnpm test` · `pnpm test <path-filter>` · `pnpm test:cov`
- `pnpm lint` · `pnpm lint:fix` · `pnpm format` · `pnpm deadcode` (knip) · `pnpm spell`
- `docker-compose up -d`: MongoDB replica set, Redis, BullBoard, JWKS server, Vault. Ports
  are in `docker-compose.yml`.

## Prisma schema

`prisma/schema.prisma` is editable. Applying it is the owner's: `pnpm db:migrate`, `pnpm
db:studio`, `pnpm migration`, `pnpm migration:seed`, `pnpm migration:remove`, `pnpm
migration:fresh`, `node dist/migration.js`, `mongosh`, `redis-cli`. Edit the schema, then hand
back the commands the owner runs.

## Commit gates

`.husky/pre-commit` runs lint-staged → typecheck → deadcode → spell → `NODE_ENV=test pnpm test`, whatever is staged. `.husky/commit-msg` runs commitlint against `.commitlintrc`. Both block.
