# Installation Documentation

## Overview

How to clone, install, seed, and run the project locally.

**Docker is the recommended path.** Compose starts PostgreSQL 18, separate Redis instances for cache and queues, a JWKS server, and BullBoard.

Use your own PostgreSQL, Redis, and JWKS endpoints when Docker is unavailable.

## Related Documents

- [Environment Documentation][ref-doc-environment]: Environment variables
- [Database Documentation][ref-doc-database]: Prisma schema and seeding
- [Configuration Documentation][ref-doc-configuration]: Config structure
- [Release Documentation][ref-doc-release]: Releasing to a production host
- [Logger Documentation][ref-doc-logger]: Boot failure and seed exit codes

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Clone Repository](#clone-repository)
- [Installation with Docker (Recommended)](#installation-with-docker-recommended)
    - [What's Included](#whats-included)
    - [Install Packages](#install-packages)
    - [Create Environment](#create-environment)
    - [Generate Keys](#generate-keys)
    - [Run Containers](#run-containers)
    - [Troubleshooting](#troubleshooting)
- [Installation without Docker](#installation-without-docker)
    - [Hosted PostgreSQL and Redis](#hosted-postgresql-and-redis)
    - [Install Packages](#install-packages-1)
    - [Create Environment](#create-environment-1)
    - [Generate Keys](#generate-keys-1)
    - [Host JWKS Files](#host-jwks-files)
- [Secret Management with Vault (Optional)](#secret-management-with-vault-optional)
- [Generate Database Client](#generate-database-client)
- [Database Migration \& Seeding](#database-migration--seeding)
- [Run Project](#run-project)
- [Development Tools](#development-tools)
- [Accessing the Application](#accessing-the-application)

## Prerequisites

> [!NOTE] This project uses pnpm. Examples below use pnpm commands.

| Tool | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 26.13.x+ | Always required |
| [pnpm](https://pnpm.io) | 12.5.x+ | Always required |
| [Git](https://git-scm.com) | 2.39.x+ | Always required |
| [Docker](https://docs.docker.com) | 28.5.x+ | Recommended for local dependencies |
| [Docker Compose](https://docs.docker.com/compose/) | 2.40.x+ | With Docker |

Without Docker, provide PostgreSQL 18, one Redis instance for cache, another for queues, and a server for the generated JWKS files.

## Clone Repository

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
cd ack-nestjs-boilerplate
git branch
```

## Installation with Docker (Recommended)

The `deps` profile starts dependencies. The API runs on the host with `pnpm start:dev`, or in Compose with the `apis` profile.

### What's Included

- **PostgreSQL 18**: Database `ACKNestJs`, user `ack`, password `ack_password`, host port `5432`
- **Redis queue**: BullMQ on host port `6379`, persistent queue data
- **Redis cache**: Cache on host port `6380`, an independent Redis service
- **JWKS server**: Serves the generated JWT public keys on host port `3011`
- **BullBoard**: Queue dashboard on host port `3010`, default login `admin` / `admin123`

### Install Packages

```bash
pnpm install
```

`pnpm` is the supported package manager. `package.json` enforces the Node and pnpm engine versions.

### Create Environment

```bash
cp .env.example .env
touch .env.docker
```

The host URLs in `.env.example` match the local Compose ports:

**Database**

```bash
DATABASE_URL=postgresql://ack:ack_password@localhost:5432/ACKNestJs?schema=public
```

**Redis**

```bash
REDIS_CACHE_URL=redis://localhost:6380/0
REDIS_QUEUE_URL=redis://localhost:6379/0
```

**JWKS**

```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
```

**MFA issuer**

```bash
MFA_TOTP_ISSUER=ACKNestJsTOTPFactor
```

The local Compose file reads optional `DOCKER_REDIS_PASSWORD`, `DOCKER_BULLBOARD_USERNAME`, `DOCKER_BULLBOARD_PASSWORD`, and `DOCKER_APIS_PORT` values from `.env.docker`. The file can stay empty for the local defaults.

- With `DOCKER_REDIS_PASSWORD` set, both Redis URLs in `.env` include the password.
- The PostgreSQL credentials in local Compose are the `ack` and `ack_password` values above.
- Percent-encode special characters in a URL password.

Example Redis URLs with a password:

```bash
REDIS_CACHE_URL=redis://:<password>@localhost:6380/0
REDIS_QUEUE_URL=redis://:<password>@localhost:6379/0
```

Full variable list: [Environment Documentation][ref-doc-environment].

Third-party integrations (AWS S3, AWS SES, Firebase, Google and Apple sign-in, Sentry) are optional. Replace their placeholder values with valid settings or leave them blank in `.env`:

- A route that needs an unavailable integration answers according to its module's configured behavior.
- S3 and SES are enabled by their credential key or secret.
- Firebase is enabled by any of its three keys.
- Once one of those integrations is enabled, startup validation requires its remaining keys.
- Google, Apple, and Sentry use their client ID or DSN when supplied.

The full trigger table is in [Environment Documentation][ref-doc-environment].

### Generate Keys

The app uses ES256 access tokens, ES512 refresh tokens, `APP_ENCRYPTION_SECRET`, and `MFA_TOTP_ENCRYPTION_SECRET`.

> [!WARNING] Keep generated keys and `.env` safe. Regenerating JWT keys invalidates issued tokens; rotating an encryption secret makes ciphertext written under the old secret unreadable.

```bash
pnpm generate:secret --direct-insert
```

Useful variants:

```bash
pnpm generate:secret
pnpm generate:secret:jwt
pnpm generate:secret:jwt --direct-insert
pnpm generate:secret:encryption
pnpm generate:secret:encryption --direct-insert
```

**What `jwt` does:**

- Writes access and refresh PEM key pairs under `keys/`, with private keys mode `0600`
- Writes `keys/access-jwks.json` and `keys/refresh-jwks.json` for the `jwks-server` container
- Prints paths and key IDs without printing private key material
- With `--direct-insert`, writes both key IDs and the four encoded key values to `.env`

**What `encryption` does:**

- Generates two 48-byte random secrets, each encoded as 64 base64url characters
- Writes them to `keys/encryption-secret.env` with mode `0600`
- With `--direct-insert`, writes both secrets to `.env`

Command behavior:

- `pnpm generate:secret` runs `jwt`, then `encryption`.
- `--direct-insert` creates `.env` from `.env.example` if the file is absent.
- `--direct-insert` writes `.env` with mode `0600`.
- `keys/` is gitignored.

> [!NOTE] Compose bind-mounts `keys/access-jwks.json` and `keys/refresh-jwks.json`; generate them before starting `jwks-server`.

> [!NOTE] The app reads the `AUTH_JWT_*_PRIVATE_KEY` and `AUTH_JWT_*_PUBLIC_KEY` values as base64 DER, not raw PEM. `--direct-insert` writes the encoded values.

Without `--direct-insert`, copy the following values into `.env` manually:

- `AUTH_JWT_ACCESS_TOKEN_KID` and `AUTH_JWT_REFRESH_TOKEN_KID`, matching the generated JWKS `kid` values
- The four JWT key variables, using the PEM bodies without armor or line breaks
- `APP_ENCRYPTION_SECRET` and `MFA_TOTP_ENCRYPTION_SECRET` from `keys/encryption-secret.env`

JWKS URLs after Compose is up:

- Access: `http://localhost:3011/.well-known/access-jwks.json`
- Refresh: `http://localhost:3011/.well-known/refresh-jwks.json`

### Run Containers

Compose services use profiles. The `deps` profile starts PostgreSQL, both Redis instances, JWKS, and BullBoard.

**Dependencies only:**

```bash
docker compose --env-file .env.docker --profile deps up -d
```

**Dependencies and API container:**

```bash
docker compose --env-file .env.docker --profile deps --profile apis up -d
```

The API container publishes port `3000` by default. Its host port can be set through `DOCKER_APIS_PORT` in `.env.docker`.

Inspect the stack with:

```bash
docker compose --env-file .env.docker --profile deps ps
docker compose --env-file .env.docker --profile deps logs -f
```

- The local Compose file is `docker-compose.yml`, and the API image uses the root `dockerfile`.
- A deployed environment uses `ci/docker-compose.yml` and `ci/dockerfile`, described in [Release][ref-doc-release].
- PostgreSQL, Redis, BullBoard, and JWKS have health checks. The API waits for its dependencies to become healthy.

#### API container (`apis` profile)

The `apis` service mounts the repository `.env` at `/app/.env`. Inside Compose, dependency URLs use service names rather than `localhost`:

```bash
APP_HTTP_HOST=0.0.0.0
APP_HTTP_PORT=3000
DATABASE_URL=postgresql://ack:ack_password@postgres:5432/ACKNestJs?schema=public
REDIS_CACHE_URL=redis://redis-cache:6379/0
REDIS_QUEUE_URL=redis://redis-queue:6379/0
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://jwks-server/.well-known/access-jwks.json
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://jwks-server/.well-known/refresh-jwks.json
```

The same `.env` file is used by `pnpm start:dev` on the host, which needs the `localhost` URLs from [Create Environment](#create-environment). Use the host URLs to run the migration and seed commands on the host, then change `.env` to the service URLs before starting the API container.

Steps:

1. Start dependencies with `docker compose --env-file .env.docker --profile deps up -d`.
2. Run `pnpm generate`, `pnpm db:migrate`, `pnpm migration:build`, and `pnpm migration:seed` on the host with the `localhost` URLs.
3. Change `.env` to the service URLs above and set `APP_HTTP_HOST=0.0.0.0`.
4. Start the API container with `docker compose --env-file .env.docker --profile deps --profile apis up -d`.

The API image runs `pnpm generate` at startup to populate its `src/generated` tmpfs.

### Troubleshooting

- **Port conflicts**: Compose publishes `5432`, `6379`, `6380`, `3010`, and `3011`, plus `3000` with the `apis` profile. Free a conflicting host port before startup; `DOCKER_APIS_PORT` changes the API host port.
- **Bind mount error naming `keys/access-jwks.json` or `keys/refresh-jwks.json`**: Run `pnpm generate:secret` to create the files.
- **PostgreSQL still starting**: Wait for the `postgres` health check to pass before running migrations.
- **PostgreSQL authentication failure**: Match `DATABASE_URL` to the local `ack` user, `ack_password`, and `ACKNestJs` database; use host `postgres` inside Compose and `localhost` on the host.
- **`NOAUTH Authentication required`**: If `DOCKER_REDIS_PASSWORD` is set, add the password to both Redis URLs. Use port `6380` for cache on the host and port `6379` for queues.
- **Invalid environment value**: Replace a placeholder in `.env` with a valid value or leave an optional integration variable blank.
- **Permissions**: Docker needs permission to create volumes and networks.

## Installation without Docker

The Node app runs on the host. Provide PostgreSQL, separate Redis instances, and hosted JWKS files.

### Hosted PostgreSQL and Redis

1. **PostgreSQL**: Provide a PostgreSQL 18 database and set `DATABASE_URL` to a PostgreSQL connection string for its database and user.
2. **Redis queue**: Provide a Redis 6.2.x+ instance for BullMQ and set `REDIS_QUEUE_URL`.
3. **Redis cache**: Provide a separate Redis 6.2.x+ instance for cache and set `REDIS_CACHE_URL`.

```bash
DATABASE_URL=postgresql://<user>:<password>@<database-host>:5432/<database>?schema=public
REDIS_QUEUE_URL=redis://<queue-host>:6379/0
REDIS_CACHE_URL=redis://<cache-host>:6379/0
```

Separate instances let cache use an eviction policy while the queue keeps its data.

### Install Packages

```bash
pnpm install
```

### Create Environment

```bash
cp .env.example .env
```

Set the PostgreSQL, Redis, and JWKS URLs in `.env`. Leave optional integration variables blank or supply valid values. Other variables: [Environment Documentation][ref-doc-environment].

### Generate Keys

Use the same commands as the Docker setup:

```bash
pnpm generate:secret --direct-insert
```

See [Generate Keys](#generate-keys) for the file and `.env` outputs.

### Host JWKS Files

Without the Compose JWKS server, publish the JWKS files:

1. Upload `keys/access-jwks.json` and `keys/refresh-jwks.json` to a static host.
2. Point `.env` at those URLs:

```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=https://<your-domain>/.well-known/access-jwks.json
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=https://<your-domain>/.well-known/refresh-jwks.json
```

## Secret Management with Vault (Optional)

[HashiCorp Vault][ref-vault] can hold secrets and write them into `.env`. The deployed Compose file defines Vault under its `vault` profile:

Set the eight required `DOCKER_*` values in `.env.docker` before using `ci/docker-compose.yml`: PostgreSQL database, user, and password; Redis password; BullBoard username and password; API UID and GID. [Vault Documentation][ref-doc-vault] covers the local secret workflow.

```bash
docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault up -d
pnpm vault:pull development
```

The bundled Vault configuration:

- Uses a persistent file backend, initialized and unsealed by the container entrypoint
- Organizes secrets by environment
- Reads them through a per-environment read-only AppRole

Full detail: [Vault Documentation][ref-doc-vault].

## Generate Database Client

`pnpm generate` writes the two gitignored sources the build imports:

- `pnpm db:generate` runs `prisma generate` from `prisma/schema.prisma` into `src/generated/prisma-client` with the ESM `prisma-client` generator.
- `pnpm generate:package` writes `src/generated/package/package.ts` with the package version, author, and repository.

```bash
pnpm generate
```

- Run this after `pnpm install`, after a Prisma schema change, and after a `package.json` version bump.
- CI and the production image run it before building.
- The local `apis` container runs it at startup to populate its generated-code tmpfs.

## Database Migration & Seeding

**Apply the PostgreSQL schema:**

```bash
pnpm db:migrate
```

`pnpm db:migrate` runs `prisma migrate dev`. A release applies the committed migrations with `pnpm db:migrate:prod` (`prisma migrate deploy`). These are owner-run commands.

**Build and seed initial data:**

```bash
pnpm migration:build
pnpm migration:seed
```

`migration:seed` runs the API key, country, feature flag, role, policy, term policy, user, workspace, and common-password seeds in dependency order.

**Remove seeded data:**

> [!WARNING] `migration:remove` deletes module data, including users and their related rows. Run it only for a database you intend to clear.

```bash
pnpm migration:remove
```

- Every seeded row names the superadmin's fixed ID (`MigrationUserSuperAdminId`) as its actor.
- Details: [Database Documentation][ref-doc-database].

Exit codes of a seed command:

- A seed that throws exits with code `1` after a `FATAL [Bootstrap]` line. The `&&` chain in `migration:seed` skips later seeds.
- A seed that logs an error and returns exits with code `0`, allowing later seeds to run.
- Details: [Logger Documentation][ref-doc-logger].

**Reset and reseed:**

> [!WARNING] `migration:fresh` runs `prisma migrate reset --force` and then the seed chain. It deletes the database contents.

```bash
pnpm migration:build
pnpm migration:fresh
```

**Seed email templates:**

- The `templateEmailNotification` command syncs SES templates and is separate from database seeding.
- With SES unconfigured, it logs a warning and skips.
- Commands and template list: [Email Documentation][ref-doc-email].

```bash
pnpm migration templateEmailNotification --type seed
```

**Seed term policies:**

- The `termPolicy` seed is part of `migration:seed`.
- With S3 configured, it uploads policy content files. Without S3, it records the content metadata without an upload.
- See [Term Policy Documentation][ref-doc-term-policy].

```bash
pnpm migration termPolicy --type seed
```

**S3 bucket policy and CORS:**

- The `awsS3Config` command configures S3 buckets separately from database seeding.
- It needs S3 and `AWS_S3_IAM_PRINCIPAL_ARN`.
- See [Third Party Integration: Bucket setup][ref-doc-third-party-s3].

```bash
pnpm migration awsS3Config --type seed
```

Database row seeds and schema: [Database Documentation][ref-doc-database].

## Run Project

With PostgreSQL and both Redis instances reachable:

```bash
pnpm start:dev
```

Production:

```bash
pnpm build
pnpm start:prod
```

Production on a host with Docker uses the image and services in `ci/`: [Release][ref-doc-release].

A failure during application startup, such as an invalid `.env` value or an unreachable dependency, logs a `FATAL [Bootstrap]` line and exits with code `1`. Details: [Logger Documentation][ref-doc-logger].

With the `apis` profile, the API container serves port `3000`, so a host `pnpm start:dev` process is unnecessary.

## Development Tools

```bash
pnpm format
pnpm lint
pnpm lint:fix
pnpm test
pnpm test:cov
pnpm typecheck
pnpm deadcode
pnpm spell
```

`pnpm test` runs `TZ=UTC vitest run --project unit`:

- `vitest.config.ts` declares the `unit` project, whose specs live under `test/unit/` and mirror `src/`.
- `test/helpers/test.logger.helper.ts` is the unit setup file.
- `pnpm test` runs without coverage; `pnpm test:cov` enforces 100% coverage on the included source files.
- The integration suite is held. Its workflow reports the hold until specs exist.
- The pre-commit hook runs staged lint and related unit specs, then typecheck.

Dependency helpers:

```bash
pnpm package:check
pnpm package:upgrade
pnpm clean && pnpm install
```

> [!NOTE] `pnpm clean` removes `dist` and `node_modules` and prunes the pnpm store before a fresh install.

## Accessing the Application

- **Base URL**: `http://localhost:3000`
- **API docs**: `http://localhost:3000/docs` (Swagger UI)
- **Queue dashboard**: `http://localhost:3010` (local Compose, default login `admin` / `admin123`)

Quick checks:

1. `http://localhost:3000/api/public/hello`
2. Swagger at `http://localhost:3000/docs`
3. Application logs for PostgreSQL and Redis connections

<!-- REFERENCES -->

[ref-vault]: https://developer.hashicorp.com/vault
[ref-doc-environment]: environment.md
[ref-doc-database]: database.md
[ref-doc-configuration]: configuration.md
[ref-doc-vault]: vault.md
[ref-doc-release]: release.md
[ref-doc-logger]: logger.md#startup-and-boot-failure
[ref-doc-email]: email.md
[ref-doc-term-policy]: term-policy.md#migration--seeding
[ref-doc-third-party-s3]: third-party-integration.md#bucket-setup
