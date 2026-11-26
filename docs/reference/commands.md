---
title: Commands Reference
description: Every pnpm script in package.json, every seed command, and the Docker Compose commands of both Compose files, with what each one runs and when to use it.
---

# Commands Reference

This page lists every `pnpm` script, seed command, and Docker Compose command of the repository, for a developer who looks up what a command runs.

## Table of Contents

- [Related Documents](#related-documents)
- [Setup and keys](#setup-and-keys)
- [Run and build](#run-and-build)
- [Checks](#checks)
- [Tests](#tests)
- [Database and seeds](#database-and-seeds)
- [Seed commands](#seed-commands)
- [Vault](#vault)
- [Maintenance](#maintenance)
- [Docker Compose](#docker-compose)

## Related Documents

- [Installation][ref-doc-installation]: the commands in the order a first run needs them
- [Configuration Reference][ref-doc-reference-configuration]: the `DOCKER_*` variables every Compose command reads
- [Production][ref-doc-production]: the commands a deployed host runs
- [Vault Guide][ref-doc-guide-vault]: the Vault commands in order
- [Contributing][ref-doc-contributing]: the checks a commit runs

## Setup and keys

The lifecycle scripts run on their own, so each sits in the row of the command that triggers it: `preinstall` and `prepare` with `pnpm install`, and the `pre` script of `build` with `pnpm build`.

| Script | Runs | When |
| --- | --- | --- |
| `pnpm install` | `preinstall` (`npx only-allow pnpm`) first, then the install, then `prepare` (`husky`, which installs the git hooks). `engines` and `.npmrc` reject npm and yarn | After a clone, and after a change to `package.json` or the lockfile |
| `pnpm generate` | `pnpm db:generate && pnpm generate:package` | After a clone, a `package.json` version bump, or a schema change. It writes `src/generated/prisma-client` and `src/generated/package/package.ts` |
| `pnpm generate:package` | `node scripts/generate-package.ts` | Writes `src/generated/package/package.ts` alone |
| `pnpm generate:secret` | `node scripts/generate-secret.ts all` | Writes the JWT keys, the JWKS files, both encryption secrets, and the MongoDB keyfile under `keys/`. `--direct-insert` also writes the JWT and encryption values into `.env` |
| `pnpm generate:secret:jwt` | `node scripts/generate-secret.ts jwt` | The JWT key pairs and JWKS files alone. `--direct-insert` writes the keys and key ids into `.env` |
| `pnpm generate:secret:encryption` | `node scripts/generate-secret.ts encryption` | `APP_ENCRYPTION_SECRET` and `MFA_TOTP_ENCRYPTION_SECRET` in `keys/encryption-secret.env`. `--direct-insert` writes them into `.env` |
| `pnpm generate:secret:mongo` | `node scripts/generate-secret.ts mongo` | The MongoDB replica set keyfile `keys/mongo-keyfile`. It never writes `.env` |

## Run and build

| Script | Runs | When |
| --- | --- | --- |
| `pnpm start:dev` | `nest start application --watch` beside `pnpm typecheck:watch` (`tsc --noEmit --watch --preserveWatchOutput -p tsconfig.build.json`) | Local development with reload and a live typecheck |
| `pnpm start` | `nest start application` | A run without the watcher |
| `pnpm build` | `nest build application`, then `pnpm typecheck`. its `pre` script runs `rimraf dist` first | Before a production start, and in CI |
| `pnpm start:prod` | `node dist/main.js` | Runs the build output |

## Checks

| Script | Runs | When |
| --- | --- | --- |
| `pnpm typecheck` | `tsc --noEmit` | After a code change |
| `pnpm typecheck:watch` | `tsc --noEmit --watch --preserveWatchOutput -p tsconfig.build.json` | Beside the watcher |
| `pnpm lint` | `eslint --max-warnings 0` | Before a commit |
| `pnpm lint:fix` | `eslint --fix` | To apply the fixable lint rules |
| `pnpm format` | Prettier over `src/`, `test/`, and the root config files | To format code |
| `pnpm deadcode` | `knip` | To find an unused file, export, type, enum member, or dependency |
| `pnpm spell` | `cspell lint` over `src/`, `test/`, `docs/`, and the root markdown files | To check spelling |
| `pnpm lint:docs` | markdownlint, remark with link validation, and Vale over `docs/`, the root markdown files, and `.github/` | After a documentation change |
| `pnpm lint:staged` | `lint-staged` | The pre-commit hook runs it |

## Tests

| Script | Runs | When |
| --- | --- | --- |
| `pnpm test` | `TZ=UTC vitest run --project unit` | The unit specs under `test/unit/`, with no Docker. `pnpm test <path-filter>` runs a subset |
| `pnpm test:cov` | `TZ=UTC vitest run --project unit --coverage` | The unit specs with the 100% coverage thresholds |
| `pnpm test:related` | `vitest related --run --project unit --passWithNoTests` | The specs related to the changed files, which `lint-staged` runs |

## Database and seeds

| Script | Runs | When |
| --- | --- | --- |
| `pnpm db:migrate` | `prisma db push` | Applies `prisma/schema.prisma` to MongoDB. The project has no migration files |
| `pnpm db:generate` | `prisma generate` | Writes the Prisma client into `src/generated/prisma-client` |
| `pnpm db:format` | `prisma format` | Formats the schema file |
| `pnpm db:studio` | `prisma studio` | Opens Prisma Studio on the database |
| `pnpm migration:build` | `nest build migration` | Builds `dist/migration.js`. Run it before a seed command |
| `pnpm migration` | `node dist/migration.js` | Runs one seed command: [Seed commands](#seed-commands) |
| `pnpm migration:seed` | `node dist/migration.js <seed> --type seed` for `apiKey`, `country`, `featureFlag`, `role`, `policy`, `termPolicy`, `user`, `workspace`, and `commonPassword`, in that order | Seeds the initial rows. A seed that throws stops the run |
| `pnpm migration:remove` | The same seeds with `--type remove`, in the order `workspace`, `user`, `apiKey`, `featureFlag`, `country`, `policy`, `role`, `termPolicy`, `commonPassword` | Removes seeded data. The `user` removal deletes every user and the rows that depend on users: sessions, activity logs, notifications, workspace members, and MFA rows |
| `pnpm migration:fresh` | `prisma db push --force-reset && pnpm run migration:seed` | Drops all data, pushes the schema, and seeds. `migration:seed` runs `dist/migration.js`, which only `pnpm migration:build` creates, so run the build first |

## Seed commands

- `pnpm migration <command> --type seed` runs one seed, and `--type remove` removes what it wrote.
- The commands: `apiKey`, `awsS3Config`, `commonPassword`, `country`, `featureFlag`, `policy`, `role`, `templateEmailNotification`, `termPolicy`, `user`, `workspace`.
- `awsS3Config` and `templateEmailNotification` sit outside `pnpm migration:seed`.
    - `awsS3Config` applies the bucket policy, CORS, and lifecycle settings to the public and private buckets. It skips with a warning when S3 or `AWS_S3_IAM_PRINCIPAL_ARN` is unset, and `--type remove` does nothing for it.
    - `templateEmailNotification` syncs the Handlebars email templates to SES. It skips with a warning when SES is unset.
- The `apiKey` seed writes keys for `APP_ENV=local` only.
- A seed that throws exits with code 1 after one `FATAL [Bootstrap]` line.

## Vault

| Script | Runs | When |
| --- | --- | --- |
| `pnpm vault:push <environment> <env-file>` | `sh ci/vault/push.sh` | Replaces an environment's path in Vault with an env file |
| `pnpm vault:pull <environment> [out-file]` | `sh ci/vault/pull.sh` | Renders an environment's path to an env file, `.env` by default |

Both run on the host Vault runs on, and neither defaults the environment: [Vault][ref-doc-concept-vault].

## Maintenance

| Script | Runs | When |
| --- | --- | --- |
| `pnpm clean` | `rimraf dist && rimraf node_modules && pnpm store prune` | Before a fresh install after a dependency conflict or a broken build |
| `pnpm package:check` | `npx npm-check-updates -i` | To pick dependency upgrades interactively |
| `pnpm package:upgrade` | `npx npm-check-updates -u` | To upgrade every dependency in `package.json` |
| `pnpm skills:update` | `npx skills@latest update -p -y` | To update the copied AI skills |

## Docker Compose

`package.json` holds no Docker script. Every Compose command passes `--env-file .env.docker`, and no profile means no service starts.

| Command | What it does |
| --- | --- |
| `docker compose --env-file .env.docker --profile deps up -d` | Starts MongoDB, `redis-queue`, `redis-cache`, BullBoard, and the JWKS server of the local stack |
| `docker compose --env-file .env.docker --profile deps --profile apis up -d` | Adds the `apis` container, which bind-mounts `src/` and `prisma/` and runs `pnpm generate` then `pnpm start:dev` |
| `docker compose --env-file .env.docker --profile deps --profile apis restart apis` | Restarts `apis` after `pnpm db:generate` |
| `docker compose --env-file .env.docker ps` | Lists the services and their health |
| `docker compose --env-file .env.docker logs -f` | Follows the logs |
| `docker compose --env-file .env.docker --profile deps --profile apis down` | Stops the local stack |
| `docker compose --env-file .env.docker -f ci/docker-compose.yml --profile deps up -d` | Starts the dependencies of a deployed environment |
| `docker compose --env-file .env.docker -f ci/docker-compose.yml --profile deps --profile apis up -d` | Starts `migrate`, which pushes the schema, then `apis` |
| `docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault up -d vault vault-bootstrap` | Starts Vault and its bootstrap job |

<!-- REFERENCES -->

[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-reference-configuration]: configuration.md#compose-variables
[ref-doc-production]: ../production.md
[ref-doc-guide-vault]: ../guides/vault.md
[ref-doc-concept-vault]: ../concepts/vault.md
[ref-doc-contributing]: ../../CONTRIBUTING.md
