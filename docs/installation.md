# Installation Documentation

## Overview

How to clone, install, seed, and run the project locally.

**Docker is the recommended path.** Compose gives you PostgreSQL, Redis, a JWKS server, and BullBoard with almost no manual wiring. Use a managed PostgreSQL instance and your own Redis only when you cannot run Docker.

## Related Documents

- [Environment Documentation][ref-doc-environment] - Environment variables
- [Database Documentation][ref-doc-database] - Schema sync and seeding
- [Configuration Documentation][ref-doc-configuration] - Config structure

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

> [!NOTE]
> This project uses PNPM. Examples below use PNPM commands.

| Tool | Version | Notes |
|------|---------|--------|
| [Node.js](https://nodejs.org) | >= 24.15.0 | Always required |
| [PNPM](http://pnpm.io) | >= 10.25.0 (pin `pnpm@12.5.1`) | Always required |
| [Git](https://git-scm.com) | v2.39.x+ | Always required |
| [Docker](https://docs.docker.com) | v28.5.x+ | **Recommended** for local PostgreSQL, Redis, JWKS, BullBoard |
| [Docker Compose](https://docs.docker.com/compose/) | v2.40.x+ | With Docker |

Without Docker you also need:

- A PostgreSQL 18 instance, hosted or self-managed
- A Redis 8+ instance for cache (`db:0`) and queues (`db:1`)

> [!IMPORTANT]
> Prefer [Installation with Docker](#installation-with-docker-recommended).

## Clone Repository

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
cd ack-nestjs-boilerplate
git branch
```

## Installation with Docker (Recommended)

Compose starts PostgreSQL, Redis, JWKS, and BullBoard already wired for this app. Run the API on the host with `pnpm start:dev`, or add the `apis` profile to run it in Compose too.

### What's Included

- **PostgreSQL** - Ready for Prisma migrations and transactions (port 5432)
- **Redis** - Cache on `db:0`, queues on `db:1` (port 6379)
- **JWKS server** - Serves your JWT public keys (port 3011)
- **BullMQ Dashboard** - Queue UI (port 3010; default `admin` / `admin123`)

### Install Packages

```bash
pnpm install
```

### Create Environment

```bash
cp .env.example .env
```

Point the app at the Compose services:

**Database**
```bash
DATABASE_URL=postgresql://ack:ack_password@localhost:5432/ACKNestJs?schema=public
```

**Redis**
```bash
CACHE_REDIS_URL=redis://localhost:6379/0
QUEUE_REDIS_URL=redis://localhost:6379/1
```

**JWKS (Compose-hosted)**
```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
```

Full variable list: [Environment Documentation][ref-doc-environment].

### Generate Keys

The app uses **ES256** access tokens, **ES512** refresh tokens, and two encryption roots: `APP_ENCRYPTION_SECRET_KEY` (notification job payloads) and `AUTH_TWO_FACTOR_ENCRYPTION_KEY` (stored TOTP secrets).

> [!WARNING]
> Back up `keys/` and `.env` before regenerating. New JWT keys invalidate every issued token. New encryption secrets leave existing ciphertext (TOTP secrets, queued notification jobs) undecryptable.

```bash
# JWT keys, JWKS files, and both encryption secrets, written into .env
pnpm generate:secret --direct-insert
```

Useful variants:

```bash
pnpm generate:secret
pnpm generate:secret:jwt [--direct-insert]
pnpm generate:secret:encryption [--direct-insert]
```

**What `jwt` does:**
- Writes access/refresh PEM key pairs under `keys/` (private keys `0600`)
- Writes `keys/access-jwks.json` and `keys/refresh-jwks.json` (the `jwks-server` container mounts these)
- Prints paths and key IDs only; key material never goes to the console
- With `--direct-insert`: upserts `AUTH_JWT_ACCESS_TOKEN_KID`, `AUTH_JWT_REFRESH_TOKEN_KID`, and the four `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` values into `.env`

**What `encryption` does:**
- Draws both encryption secrets (48 random bytes each, 64 base64url characters)
- Writes them to `keys/encryption-secret.env` (`0600`) and prints only that path
- With `--direct-insert`: upserts those two variables into `.env`

`pnpm generate:secret` runs `jwt` then `encryption`. `--direct-insert` creates `.env` from `.env.example` when missing and sets `.env` to `0600`. The `keys/` directory is gitignored.

> [!NOTE]
> The app reads `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` as base64 (DER), not raw PEM. `--direct-insert` writes the correctly encoded values. Without it, copy the two lines from `keys/encryption-secret.env` into `.env` by hand.

JWKS URLs after Compose is up:

- Access: `http://localhost:3011/.well-known/access-jwks.json`
- Refresh: `http://localhost:3011/.well-known/refresh-jwks.json`

### Run Containers

By default Compose starts dependencies only (PostgreSQL, Redis, JWKS, BullBoard). The API stays on the host unless you enable the `apis` profile.

**Dependencies only:**
```bash
docker-compose up -d
```

**Dependencies + API container:**
```bash
docker-compose --profile apis up -d
```

That brings up:

- PostgreSQL on `5432`
- Redis on `6379`
- JWKS server on `3011`
- BullBoard on `3010`
- With `--profile apis`, the API on `3000`

```bash
docker-compose ps
docker-compose logs -f
```

Health checks mark each service ready only after its check passes.

### Troubleshooting

- **Port conflicts** - Free `5432`, `6379`, `3010`, and `3011`
- **Host resolution** - Add `127.0.0.1 host.docker.internal` to `/etc/hosts` if needed
- **Permissions** - Confirm Docker can create volumes and networks

## Installation without Docker

Use this only when Docker is not an option. You still run the Node app on the host with PNPM; PostgreSQL and Redis come from hosted services.

### Hosted PostgreSQL and Redis

1. **PostgreSQL** - Create a managed PostgreSQL 18 instance. Copy the connection string into `DATABASE_URL`.
2. **Redis** - Use a hosted Redis 8+ service such as [Amazon ElastiCache][ref-elasticache]. Point cache and queues at different logical DBs when you can:
   ```bash
   CACHE_REDIS_URL=redis://<host>:6379/0
   QUEUE_REDIS_URL=redis://<host>:6379/1
   ```

### Install Packages

```bash
pnpm install
```

### Create Environment

```bash
cp .env.example .env
```

Set at least:

```bash
DATABASE_URL=<your PostgreSQL connection string>
CACHE_REDIS_URL=redis://<your-redis-host>:6379/0
QUEUE_REDIS_URL=redis://<your-redis-host>:6379/1
```

Other variables: [Environment Documentation][ref-doc-environment].

### Generate Keys

Same commands as Docker. Prefer:

```bash
pnpm generate:secret --direct-insert
```

See [Generate Keys](#generate-keys) under the Docker section for what each target writes and for the backup warning.

### Host JWKS Files

Without the Compose JWKS server you must publish the JWKS files yourself:

1. Upload `keys/access-jwks.json` and `keys/refresh-jwks.json` to a public URL (S3, CDN, or any static host)
2. Point `.env` at those URLs:

```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI="https://<your_domain>/.well-known/access-jwks.json"
AUTH_JWT_REFRESH_TOKEN_JWKS_URI="https://<your_domain>/.well-known/refresh-jwks.json"
```

## Secret Management with Vault (Optional)

Instead of hand-managing `.env`, you can run an optional [HashiCorp Vault][ref-vault] server that holds secrets and writes them into `.env`. It sits behind the `vault` Compose profile:

```bash
docker compose --profile vault up -d
pnpm vault:pull
```

The bundled config uses a persistent file backend, auto-initialized and auto-unsealed by the container entrypoint. Secrets are laid out per environment (`production`, `staging`, `development`) and read through a per-environment read-only AppRole. Full detail: [Vault Documentation][ref-doc-vault].


## Generate Database Client

`pnpm generate` writes the two gitignored sources the build imports:

- `pnpm db:generate` (`prisma generate`): Prisma client from `prisma/schema.prisma` into `src/generated/prisma-client` (ESM, `prisma-client` generator)
- `pnpm generate:package`: `src/generated/package/package.ts` (`version`, `author`, `repository` from `package.json` for `app.config.ts`)

```bash
pnpm generate
```

Run this after `pnpm install`, and again after changes to `prisma/schema.prisma` or those `package.json` fields. CI and both dockerfiles run it before building.

## Database Migration & Seeding

**Apply Prisma migrations to PostgreSQL:**
```bash
pnpm db:migrate
```

**Seed initial data:**
```bash
pnpm migration:seed
```

**Remove seeded data:**

> [!WARNING]
> `migration:remove` deletes more than the seeded rows: the `user` seed's removal deletes every user, session, and activity log, and the API key, country, feature flag, role, and term policy seeds each delete their whole table.

```bash
pnpm migration:remove
```

Every seeded row names the superadmin's fixed id (`MigrationUserSuperAdminId`) as its actor. When the database holds a superadmin under a different id, `pnpm migration:seed` logs an error from the `user` seed and writes no user. Realign with `pnpm migration:remove`, then `pnpm migration:seed`. Details: [Database Documentation][ref-doc-database].

**Reset and reseed:**

> [!WARNING]
> `migration:fresh` runs `prisma migrate reset --force`, which drops all existing data.

```bash
pnpm migration:fresh
```

**Seed email templates:**

SES template sync (not a database seed). Commands and template list: [Email Documentation][ref-doc-email].

```bash
pnpm migration templateEmailNotification --type seed
```

**Seed term policies (HTML on S3):**

See [Term Policy Documentation][ref-doc-term-policy].

```bash
pnpm migration templateTermPolicy --type seed
```

**S3 bucket policy / CORS:**

See [Third Party Integration; Bucket setup][ref-doc-third-party-s3].

```bash
pnpm migration awsS3Config --type seed
```

Database row seeds and schema sync: [Database Documentation][ref-doc-database].


## Run Project

With PostgreSQL and Redis reachable (Compose or hosted):

```bash
pnpm start:dev
```

Production:

```bash
pnpm build
pnpm start:prod
```

If you started Compose with `--profile apis`, the API is already on port 3000 and you can skip `pnpm start:dev` on the host.

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

`pnpm test` is `TZ=UTC vitest run --passWithNoTests`:

- No coverage by default (`coverage.enabled` is `false` in `vitest.config.ts`)
- `pnpm test:cov` adds `--coverage` and applies the 100% thresholds
- The suite is unit specs only
- `pre-commit` and CI (`.github/workflows/test.yml`, `workflow_dispatch`) run `NODE_ENV=test pnpm test`
- `.github/workflows/linter.yml` runs on `pull_request`
- `testTimeout` is 5000ms

Dependency helpers:

```bash
pnpm package:check
pnpm package:upgrade
pnpm clean && pnpm install
```

> [!NOTE]
> `pnpm clean` removes `node_modules`, `dist`, and the pnpm cache before a fresh install. Useful after dependency conflicts or a broken build.


## Accessing the Application

- **Base URL**: `http://localhost:3000`
- **API docs**: `http://localhost:3000/docs` (Swagger UI)
- **Queue dashboard**: `http://localhost:3010` (Docker Compose; default `admin` / `admin123`)

Quick checks:

1. `http://localhost:3000/api/public/hello`
2. Swagger at `http://localhost:3000/docs`
3. App logs for PostgreSQL and Redis connections



<!-- REFERENCES -->

[ref-vault]: https://developer.hashicorp.com/vault
[ref-elasticache]: https://aws.amazon.com/elasticache/

[ref-doc-environment]: environment.md
[ref-doc-database]: database.md
[ref-doc-configuration]: configuration.md
[ref-doc-vault]: vault.md
[ref-doc-email]: email.md
[ref-doc-term-policy]: term-policy.md#migration--seeding
[ref-doc-third-party-s3]: third-party-integration.md#bucket-setup
