# Installation Documentation

## Overview

How to clone, install, seed, and run the project locally.

**Docker is the recommended path.** Compose gives you a MongoDB replica set, Redis, a JWKS server, and BullBoard with almost no manual wiring.

Use [MongoDB Atlas][ref-mongodb] and your own Redis only when you cannot run Docker.

## Related Documents

- [Environment Documentation][ref-doc-environment]: Environment variables
- [Database Documentation][ref-doc-database]: Schema sync and seeding
- [Configuration Documentation][ref-doc-configuration]: Config structure
- [Release Documentation][ref-doc-release]: Releasing to a production host

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
    - [Hosted MongoDB and Redis](#hosted-mongodb-and-redis)
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

> [!NOTE] This project uses PNPM. Examples below use PNPM commands.

| Tool | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | >= 24.15.0 | Always required |
| [PNPM](http://pnpm.io) | >= 10.25.0 (pin `pnpm@12.5.1`) | Always required |
| [Git](https://git-scm.com) | v2.39.x+ | Always required |
| [Docker](https://docs.docker.com) | v28.5.x+ | **Recommended** for local MongoDB, Redis, JWKS, BullBoard |
| [Docker Compose](https://docs.docker.com/compose/) | v2.40.x+ | With Docker |

Without Docker you also need:

- A [MongoDB Atlas][ref-mongodb] cluster, or any MongoDB 8.0+ **replica set** (Prisma transactions need one).
- The project runs MongoDB 8: the production Compose file pins `mongo:8.3.11`.
- A Redis 6.0+ instance for cache (`db:0`) and queues (`db:1`). `SessionCache` runs `SCAN` with the `TYPE` option, which Redis supports from 6.0.

> [!IMPORTANT] Prefer [Installation with Docker](#installation-with-docker-recommended). Local single-node MongoDB without a replica set will break Prisma transactions.

## Clone Repository

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
cd ack-nestjs-boilerplate
git branch
```

## Installation with Docker (Recommended)

Compose starts MongoDB, Redis, JWKS, and BullBoard already wired for this app.

The API runs on the host with `pnpm start:dev`, or in Compose with the `apis` profile.

### What's Included

- **MongoDB replica set**: Ready for Prisma transactions (port 27017). Authentication is off unless `DOCKER_MONGO_ROOT_PASSWORD` is set
- **Redis**: Cache on `db:0`, queues on `db:1` (port 6379). Authentication is off unless `DOCKER_REDIS_PASSWORD` is set
- **JWKS server**: Serves your JWT public keys (port 3011)
- **BullMQ Dashboard**: Queue UI on port 3010, default login `admin` / `admin123`

### Install Packages

```bash
pnpm install
```

### Create Environment

```bash
cp .env.example .env
```

Point the host app at the Compose services:

**Database**

```bash
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
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

**Two-factor issuer** (required and empty in `.env.example`, which `pnpm generate:secret` leaves alone)

```bash
AUTH_TWO_FACTOR_ISSUER=ACKNestJs
```

The `DOCKER_*` variables in `.env` are optional and empty in `.env.example`.

- Compose reads them from `.env`.
- A variable left empty falls back to plain MongoDB, plain Redis, and the BullBoard login `admin` / `admin123`.
- To turn authentication on, set `DOCKER_MONGO_ROOT_PASSWORD` and `DOCKER_REDIS_PASSWORD` and put the credentials into the URLs.
- `<user>` is `DOCKER_MONGO_ROOT_USERNAME`, `root` when it is empty.
- Special characters in a password are percent-encoded.

Example URLs:

```bash
DATABASE_URL=mongodb://<user>:<password>@localhost:27017/ACKNestJs?authSource=admin&retryWrites=true&w=majority&replicaSet=rs0
CACHE_REDIS_URL=redis://:<password>@localhost:6379/0
QUEUE_REDIS_URL=redis://:<password>@localhost:6379/1
```

Full variable list: [Environment Documentation][ref-doc-environment].

Third-party integrations (AWS S3, AWS SES, Firebase, Google and Apple sign-in, Sentry) are optional. Leave their lines blank in `.env` and the app boots without them:

- A route that needs S3 or a social sign-in that is not set up answers 404.
- Email and push delivery are skipped.
- The health indicator of each missing integration reports it down.

Turning one on:

- S3 and SES turn on when their IAM credential key or secret is set.
- Firebase turns on when any of its three keys is set.
- Once one of those is on, startup validation fails with the keys it still needs.
- Google, Apple, and Sentry turn on from their client id or DSN alone.
- A region, bucket, or `EMAIL_*` value set on its own boots fine.

The full trigger table is in [Environment Documentation][ref-doc-environment].

### Generate Keys

The app uses:

- **ES256** access tokens
- **ES512** refresh tokens
- two encryption roots: `APP_ENCRYPTION_SECRET_KEY` (notification job payloads) and `AUTH_TWO_FACTOR_ENCRYPTION_KEY` (stored TOTP secrets)

Compose also mounts a MongoDB keyfile, `keys/mongo-keyfile`.

> [!WARNING] Back up `keys/` and `.env` before regenerating. New JWT keys invalidate every issued token. New encryption secrets leave existing ciphertext (TOTP secrets, queued notification jobs) undecryptable.

```bash
# JWT keys, JWKS files, both encryption secrets, and the MongoDB keyfile;
# the JWT and encryption values are written into .env
pnpm generate:secret --direct-insert
```

Useful variants:

```bash
pnpm generate:secret
pnpm generate:secret:jwt [--direct-insert]
pnpm generate:secret:encryption [--direct-insert]
pnpm generate:secret:mongo
```

**What `jwt` does:**

- Writes access/refresh PEM key pairs under `keys/` (private keys `0600`)
- Writes `keys/access-jwks.json` and `keys/refresh-jwks.json` (the `jwks-server` container mounts these)
- Prints paths and key IDs only, never key material
- With `--direct-insert`: upserts `AUTH_JWT_ACCESS_TOKEN_KID`, `AUTH_JWT_REFRESH_TOKEN_KID`, and the four `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` values into `.env`

**What `encryption` does:**

- Draws both encryption secrets (48 random bytes each, 64 base64url characters)
- Writes them to `keys/encryption-secret.env` (`0600`) and prints only that path
- With `--direct-insert`: upserts those two variables into `.env`

**What `mongo` does:**

- Draws 756 random bytes, base64 encoded, and writes them to `keys/mongo-keyfile` with mode `0400`
- Replaces an existing keyfile
- Never writes to `.env`, and `--direct-insert` does nothing for it: Compose mounts the file at `/etc/mongo/keyfile`

Command behavior:

- `pnpm generate:secret` runs `jwt`, `encryption`, then `mongo`.
- `--direct-insert` creates `.env` from `.env.example` when missing.
- `--direct-insert` sets `.env` to `0644`, so the non-root production container user can read it through the bind mount.
- The `keys/` directory is gitignored.

> [!NOTE] Both Compose files mount `keys/access-jwks.json`, `keys/refresh-jwks.json`, and `keys/mongo-keyfile` as bind mounts that fail the start when the file is missing. Run `pnpm generate:secret` before the first `docker-compose up`.

> [!NOTE] The app reads `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` as base64 (DER), not raw PEM. `--direct-insert` writes the encoded values.

Without `--direct-insert`, a manual `.env` needs these values from each target:

- `jwt`:
    - `AUTH_JWT_ACCESS_TOKEN_KID` and `AUTH_JWT_REFRESH_TOKEN_KID`, the `kid` values the command prints and the JWKS files hold.
    - The four `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` values, each from its PEM file under `keys/` with the `-----BEGIN` and `-----END` lines and the line breaks removed.
- `encryption`: both lines of `keys/encryption-secret.env`, copied as they are.
- `mongo`: nothing. The app does not read the keyfile, and Compose mounts `keys/mongo-keyfile` into the `mongo` container.

JWKS URLs after Compose is up:

- Access: `http://localhost:3011/.well-known/access-jwks.json`
- Refresh: `http://localhost:3011/.well-known/refresh-jwks.json`

### Run Containers

By default Compose starts dependencies only (MongoDB, Redis, JWKS, BullBoard).

The API stays on the host unless the `apis` profile is enabled.

**Dependencies only:**

```bash
docker-compose up -d
```

**Dependencies + API container:**

```bash
docker-compose --profile apis up -d
```

That brings up:

- MongoDB single-node replica set on `27017`
- Redis on `6379`
- JWKS server on `3011`
- BullBoard on `3010`
- With `--profile apis`, the API on `3000`

The API container reads different `.env` values from the host app: see [API container](#api-container-apis-profile).

```bash
docker-compose ps
docker-compose logs -f
```

- The Compose file for local work is `docker-compose.yml`, and the API image is the root `dockerfile`.
- A production host uses `ci/docker-compose.production.yml` and `ci/dockerfile.production`, described in [Release][ref-doc-release].
- MongoDB, Redis, the JWKS server, the API container, and Vault (profile `vault`) carry health checks.
- A service that depends on one starts after that check passes, so `vault-bootstrap` waits for Vault.

#### API container (`apis` profile)

The `apis` service mounts the repository `.env` at `/app/.env`, the file the host app reads. Inside the Compose network the other services answer on their service names, and `localhost` points at the container itself. For the container the file holds:

- `HTTP_HOST` is `0.0.0.0`.
- `HTTP_PORT` is `3000`, the port Compose publishes and the container health check calls.
- `DATABASE_URL` uses host `mongo` on port `27017`.
- `CACHE_REDIS_URL` and `QUEUE_REDIS_URL` use host `redis` on port `6379`.
- `AUTH_JWT_ACCESS_TOKEN_JWKS_URI` and `AUTH_JWT_REFRESH_TOKEN_JWKS_URI` use host `jwks-server` on port `80`, the port nginx listens on inside the network.

```bash
HTTP_HOST=0.0.0.0
DATABASE_URL=mongodb://mongo:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
CACHE_REDIS_URL=redis://redis:6379/0
QUEUE_REDIS_URL=redis://redis:6379/1
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://jwks-server/.well-known/access-jwks.json
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://jwks-server/.well-known/refresh-jwks.json
```

The same file feeds `pnpm start:dev` on the host, which needs the `localhost` values from [Create Environment](#create-environment). With authentication on, the credentials from that section go into these URLs too.

MongoDB reports its replica set member as `host.docker.internal:27017`:

- `ci/mongo/entrypoint.sh` sets that host through `RS_HOST`, and `docker-compose.yml` does not override it.
- A client with `replicaSet=rs0` connects to the member host the replica set reports.
- Compose maps `host.docker.internal` to the host gateway on both the `mongo` and the `apis` services (`extra_hosts`), so the name resolves inside `apis` and inside `mongo`. The host machine resolves it through its own OS.

Steps:

1. Start the dependencies: `docker-compose up -d`.
2. With the `localhost` values in `.env`, run `pnpm db:migrate` and `pnpm migration:seed` on the host.
3. Change `.env` to the container values above.
4. Start the API container: `docker-compose --profile apis up -d`.

### Troubleshooting

- **Port conflicts**: Compose publishes ports `27017`, `6379`, `3010`, and `3011` on the host, so a process already on one of them blocks the start.
    - The published MongoDB host port is `27017`, the port in the replica set member host.
    - The replica set member host is `host.docker.internal:27017`, so the host machine and the containers reach the same member.
- **Host resolution**: Add `127.0.0.1 host.docker.internal` to the host machine's `/etc/hosts` when the name does not resolve there. The containers need no entry.
- **Bind mount error naming a file under `keys/`**: The file does not exist yet. Run `pnpm generate:secret`.
- **Replica set still starting**: The replica set takes a minute or two after the first `up`.
- **Permissions**: Docker needs permission to create volumes and networks.

## Installation without Docker

Use this only when Docker is not an option:

- The Node app runs on the host with PNPM.
- MongoDB and Redis come from hosted services.

### Hosted MongoDB and Redis

1. **MongoDB**: Create a [MongoDB Atlas][ref-mongodb] cluster, or use any MongoDB deployment that is a **replica set**. Copy the connection string into `DATABASE_URL`.
2. **Redis**: Use a hosted Redis 6.0+ service such as [Amazon ElastiCache][ref-elasticache]. Point cache and queues at different logical DBs when you can:
    ```bash
    CACHE_REDIS_URL=redis://<host>:6379/0
    QUEUE_REDIS_URL=redis://<host>:6379/1
    ```

> [!IMPORTANT] Prisma transactions need a replica set, so Atlas (and any other MongoDB you use) runs as one. Without one, transactions fail.

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
DATABASE_URL=<your Atlas (or other replica-set) connection string>
CACHE_REDIS_URL=redis://<your-redis-host>:6379/0
QUEUE_REDIS_URL=redis://<your-redis-host>:6379/1
AUTH_TWO_FACTOR_ISSUER=ACKNestJs
```

Other variables: [Environment Documentation][ref-doc-environment].

### Generate Keys

Same commands as Docker. Prefer:

```bash
pnpm generate:secret --direct-insert
```

See [Generate Keys](#generate-keys) under the Docker section for what each target writes and for the backup warning.

### Host JWKS Files

Without the Compose JWKS server, publish the JWKS files yourself:

1. Upload `keys/access-jwks.json` and `keys/refresh-jwks.json` to a public URL (S3, CDN, or any static host)
2. Point `.env` at those URLs:

```bash
AUTH_JWT_ACCESS_TOKEN_JWKS_URI="https://<your_domain>/.well-known/access-jwks.json"
AUTH_JWT_REFRESH_TOKEN_JWKS_URI="https://<your_domain>/.well-known/refresh-jwks.json"
```

## Secret Management with Vault (Optional)

Instead of hand-managing `.env`, an optional [HashiCorp Vault][ref-vault] server can hold secrets and write them into `.env`. It sits behind the `vault` Compose profile:

```bash
docker compose --profile vault up -d
pnpm vault:pull
```

The bundled config:

- uses a persistent file backend, auto-initialized and auto-unsealed by the container entrypoint
- lays secrets out per environment (`production`, `staging`, `development`)
- reads them through a per-environment read-only AppRole

Full detail: [Vault Documentation][ref-doc-vault].

## Generate Database Client

`pnpm generate` writes the two gitignored sources the build imports:

- `pnpm db:generate` (`prisma generate`): Prisma client from `prisma/schema.prisma` into `src/generated/prisma-client` (ESM, `prisma-client` generator)
- `pnpm generate:package`: `src/generated/package/package.ts` (`version`, `author`, `repository` from `package.json` for `app.config.ts`)

```bash
pnpm generate
```

- Run this after `pnpm install`, and again after changes to `prisma/schema.prisma` or those `package.json` fields.
- The CI workflows and both dockerfiles (`dockerfile` for local work, `ci/dockerfile.production`) run it before building.

## Database Migration & Seeding

**Sync schema to MongoDB:**

```bash
pnpm db:migrate
```

**Seed initial data:**

```bash
pnpm migration:seed
```

**Remove seeded data:**

> [!WARNING] `migration:remove` deletes more than the seeded rows: the `user` seed's removal deletes every user, session, and activity log, and the API key, country, feature flag, role, and term policy seeds each delete their whole collection.

```bash
pnpm migration:remove
```

- Every seeded row names the superadmin's fixed id (`MigrationUserSuperAdminId`) as its actor.
- When the database holds a superadmin under a different id, `pnpm migration:seed` logs an error from the `user` seed and writes no user.
- Realign with `pnpm migration:remove`, then `pnpm migration:seed`.
- Details: [Database Documentation][ref-doc-database].

**Reset and reseed:**

> [!WARNING] `migration:fresh` runs `prisma db push --force-reset`, which drops all existing data.

```bash
pnpm migration:fresh
```

**Seed email templates:**

- It syncs SES templates and is not a database seed.
- With SES unconfigured, the seed logs a warning and skips.
- Commands and template list: [Email Documentation][ref-doc-email].

```bash
pnpm migration templateEmailNotification --type seed
```

**Seed term policies (HTML on S3):**

- With S3 unconfigured, the seed logs a warning and skips.
- See [Term Policy Documentation][ref-doc-term-policy].

```bash
pnpm migration templateTermPolicy --type seed
```

**S3 bucket policy / CORS:**

- The seed needs S3 and `AWS_S3_IAM_ARN` (the principal the public bucket policy grants).
- With either unset, it logs a warning and skips.
- See [Third Party Integration: Bucket setup][ref-doc-third-party-s3].

```bash
pnpm migration awsS3Config --type seed
```

Database row seeds and schema sync: [Database Documentation][ref-doc-database].

## Run Project

With MongoDB and Redis reachable (Compose or hosted):

```bash
pnpm start:dev
```

Production:

```bash
pnpm build
pnpm start:prod
```

Production on a host with Docker runs the same build in a container: [Release][ref-doc-release].

With `--profile apis` the API container already serves port 3000, so `pnpm start:dev` on the host is skipped. The container reads the `.env` values listed under [API container](#api-container-apis-profile).

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

`pnpm test` is `TZ=UTC vitest run --project unit`:

- `vitest.config.ts` declares one project, `unit`.
    - Its specs live under `test/unit/`, mirroring `src/`.
    - `test/helpers/test.logger.helper.ts` is the setup file.
- No coverage by default (`coverage.enabled` is `false` in `vitest.config.ts`)
- `pnpm test:cov` adds `--coverage` and applies the 100% thresholds
- `pre-commit` and CI (`.github/workflows/test-unit.yml`, `workflow_dispatch`) run `NODE_ENV=test pnpm test`
- `.github/workflows/linter.yml` runs on `pull_request` and `workflow_dispatch`
- `testTimeout` is 5000ms

Dependency helpers:

```bash
pnpm package:check
pnpm package:upgrade
pnpm clean && pnpm install
```

> [!NOTE] `pnpm clean` removes `dist` and `node_modules` and prunes the pnpm store before a fresh install.
>
> It helps after dependency conflicts or a broken build.

## Accessing the Application

- **Base URL**: `http://localhost:3000`
- **API docs**: `http://localhost:3000/docs` (Swagger UI)
- **Queue dashboard**: `http://localhost:3010` (Docker Compose, default login `admin` / `admin123`)

Quick checks:

1. `http://localhost:3000/api/public/hello`
2. Swagger at `http://localhost:3000/docs`
3. App logs for MongoDB and Redis connections

<!-- REFERENCES -->

[ref-vault]: https://developer.hashicorp.com/vault
[ref-mongodb]: https://www.mongodb.com/products/platform/atlas-database
[ref-elasticache]: https://aws.amazon.com/elasticache/
[ref-doc-environment]: environment.md
[ref-doc-database]: database.md
[ref-doc-configuration]: configuration.md
[ref-doc-vault]: vault.md
[ref-doc-release]: release.md
[ref-doc-email]: email.md
[ref-doc-term-policy]: term-policy.md#migration--seeding
[ref-doc-third-party-s3]: third-party-integration.md#bucket-setup
