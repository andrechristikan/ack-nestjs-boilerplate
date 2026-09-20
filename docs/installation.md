# Installation Documentation

## Overview

How to clone, install, seed, and run the project locally.

## Related Documents

- [Environment Documentation][ref-doc-environment] - For complete environment variable configuration
- [Database Documentation][ref-doc-database] - For database setup and migration details
- [Configuration Documentation][ref-doc-configuration] - For understanding configuration structure

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
  - [Required Tools](#required-tools)
- [Clone Repository](#clone-repository)
- [Standard Installation](#standard-installation)
  - [Install Packages](#install-packages)
  - [Create Environment](#create-environment)
  - [Generate Keys](#generate-keys)
- [Installation with Docker](#installation-with-docker)
  - [What's Included](#whats-included)
  - [Prerequisites](#prerequisites-1)
  - [Create Environment](#create-environment-1)
  - [Generate Keys](#generate-keys-1)
  - [Run Containers](#run-containers)
  - [Troubleshooting](#troubleshooting)
- [Secret Management with Vault (Optional)](#secret-management-with-vault-optional)
- [Generate Database Client](#generate-database-client)
- [Database Migration & Seeding](#database-migration--seeding)
- [Run Project](#run-project)
- [Development Tools](#development-tools)
- [Accessing the Application](#accessing-the-application)


## Prerequisites

> [!NOTE]
> ACK NestJS Boilerplate uses PNPM for package management. All documentation examples will use PNPM commands.

Required tools:

### Required Tools

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org) | v24.11.0+ |
| [PostgreSQL](https://www.postgresql.org/docs/) | v18.x |
| [Redis](https://redis.io) | v8.8.0 |
| [PNPM](http://pnpm.io) | v11.5.x |
| [Git](https://git-scm.com) | v2.39.x |

## Clone Repository

Clone the project repository from GitHub:

```bash
# Clone the repository
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git

# Navigate to the project directory
cd ack-nestjs-boilerplate

# Check the current branch (should be 'main')
git branch
```

## Standard Installation

Standard installation assumes all dependencies are installed correctly and available in your environment.

### Install Packages

This step will install all the required Node.js packages and dependencies for the project.

```bash
# Install all dependencies
pnpm install
```

### Create Environment

The environment file contains all configuration settings for your application including database connections, JWT settings, and external service configurations.

```bash
# Copy the example environment file
cp .env.example .env
```

> **For environment configuration details**, refer to the [Environment Documentation][ref-doc-environment].

### Generate Keys

ACK NestJS Boilerplate uses **ES256** for Access Tokens and **ES512** for Refresh Tokens, and two encryption root secrets: `APP_ENCRYPTION_SECRET_KEY` (notification job payloads) and `AUTH_TWO_FACTOR_ENCRYPTION_KEY` (stored TOTP secrets). `scripts/generate-secret.ts` generates all of them.

#### Generate Key Pairs and Secrets

> [!WARNING]
> Back up the existing `keys/` directory and `.env` before regenerating. New JWT keys invalidate every issued token, and new encryption secrets leave existing ciphertext (stored TOTP secrets, queued notification jobs) undecryptable.

```bash
# JWT keys, JWKS files, and both encryption secrets
pnpm generate:secret

# Same, and upsert every generated variable into .env
pnpm generate:secret --direct-insert

# One target only
pnpm generate:secret:jwt [--direct-insert]
pnpm generate:secret:encryption [--direct-insert]
```

**What `jwt` does:**
- Creates private/public key pairs for both access and refresh tokens, saved as PEM files in `keys/` (private keys `0600`)
- Writes `keys/access-jwks.json` and `keys/refresh-jwks.json` for public key distribution
- Prints only the output file paths and the generated key IDs (KIDs); key material is **never** printed to the console
- With `--direct-insert`: upserts `AUTH_JWT_ACCESS_TOKEN_KID`, `AUTH_JWT_REFRESH_TOKEN_KID`, and the four `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` variables into `.env`, and nothing else

**What `encryption` does:**
- Draws `APP_ENCRYPTION_SECRET_KEY` and `AUTH_TWO_FACTOR_ENCRYPTION_KEY`, each 48 random bytes encoded as 64 base64url characters
- Writes both as `KEY=value` lines to `keys/encryption-secret.env` (mode `0600`) and prints only that path
- With `--direct-insert`: upserts those two variables into `.env`, and nothing else

`all` (the plain `pnpm generate:secret`) runs `jwt`, then `encryption`, with the same `--direct-insert` choice for both. `--direct-insert` creates `.env` from `.env.example` when it is absent and sets `.env` to mode `0600`. The `keys/` directory is gitignored.

> [!NOTE]
> **Populating `.env`**: The application reads the `AUTH_JWT_*_PRIVATE_KEY` / `AUTH_JWT_*_PUBLIC_KEY` variables as base64 (DER), not as raw PEM. `--direct-insert` writes the correctly-encoded values into `.env`. The `keys/*.pem` files are PEM artifacts and do not go into `.env` as they are. Without `--direct-insert`, the two encryption lines in `keys/encryption-secret.env` are copied into `.env` by hand.

#### Hosting JWKS Files

The generated JWKS files need to be publicly accessible for JWT verification:

**Option 1: AWS S3**
Upload the JWKS files to your S3 bucket and make them publicly accessible.

**Option 2: Any Public Server**
Upload the files to any publicly accessible URL and note the URLs for your `.env` configuration.

#### Update Environment

After hosting your JWKS files, update your `.env` file:

```bash
# Update with your actual JWKS URLs
AUTH_JWT_ACCESS_TOKEN_JWKS_URI="https://<your_domain>/.well-known/access-jwks.json"
AUTH_JWT_REFRESH_TOKEN_JWKS_URI="https://<your_domain>/.well-known/refresh-jwks.json"
```


## Installation with Docker

> [!NOTE]
> You can skip this section if all dependencies are already installed and you do not want to use Docker for your setup.

Compose starts the services listed below, already wired to the app.

### What's Included

The Docker setup provides:
- **PostgreSQL** - Primary relational database
- **Redis** - Single instance serving both caching (`db:0`) and queues (`db:1`)
- **JWKS server** - Hosts your JWT public keys automatically
- **BullMQ Dashboard** - Queue monitoring interface

### Prerequisites

Ensure you have Docker and Docker Compose installed on your system:

#### Required Tools

| Tool | Version |
|------|---------|
| [Docker](https://docs.docker.com) | v28.5.x+ |
| [Docker Compose](https://docs.docker.com/compose/) | v2.40.x+ |

### Create Environment

The environment setup for Docker installation is the same as the standard installation, but with Docker-specific configurations.

```bash
# Copy the example environment file
cp .env.example .env
```

#### Docker-Specific Configuration

> [!NOTE]
> The Docker setup automatically handles service networking and JWKS hosting, making configuration simpler than manual setup.

For Docker installation, ensure these specific values in your `.env` file:

**Database Configuration:**
```bash
# PostgreSQL (Docker containers)
DATABASE_URL=postgresql://ack:ack_password@localhost:5432/ACKNestJs?schema=public
```

**Redis Configuration:**
```bash
# Redis (Docker containers)
CACHE_REDIS_URL=redis://localhost:6379/0
QUEUE_REDIS_URL=redis://localhost:6379/1
```

**JWKS Configuration (Docker-hosted):**
```bash
# JWKS server URLs (hosted by Docker container)
AUTH_JWT_ACCESS_TOKEN_JWKS_URI=http://localhost:3011/.well-known/access-jwks.json
AUTH_JWT_REFRESH_TOKEN_JWKS_URI=http://localhost:3011/.well-known/refresh-jwks.json
```

> **For environment configuration details**, refer to the [Environment Documentation][ref-doc-environment].

### Generate Keys

Key generation for Docker installation follows the same process as standard installation; the JWKS files are served by a Compose container.

#### Generate Key Pairs and Secrets

> [!WARNING]
> Back up the existing `keys/` directory and `.env` before regenerating. New JWT keys invalidate every issued token, and new encryption secrets leave existing ciphertext undecryptable.

```bash
# Generate the JWT keys, JWKS files, and encryption secrets, and write them into .env
pnpm generate:secret --direct-insert
```

The command writes `keys/access-jwks.json` and `keys/refresh-jwks.json`, which the `jwks-server` container mounts read-only, and `keys/encryption-secret.env`. See [Generate Keys](#generate-keys) for what each target writes.

#### Docker JWKS Hosting

Unlike standard installation, Docker automatically serves your JWKS files through a dedicated container:

- **Access JWKS**: `http://localhost:3011/.well-known/access-jwks.json`
- **Refresh JWKS**: `http://localhost:3011/.well-known/refresh-jwks.json`

The JWKS server in Compose hosts the generated key files.

### Run Containers

Start the Docker environment.

> [!NOTE]
> By default, Docker installation only sets up dependencies (PostgreSQL, Redis, JWKS server, BullMQ dashboard). The API container is not included. To also run the API container, use the `apis` profile.

**Start only dependencies:**
```bash
# Start PostgreSQL, Redis, JWKS, and BullMQ dashboard
docker-compose up -d
```

**Start with API container (recommended for full development setup):**
```bash
# Start all services including the API container
docker-compose --profile apis up -d
```

**What this command does:**
- Starts PostgreSQL (port 5432)
- Launches Redis server for caching and queues (port 6379)
- Starts JWKS server to host your JWT public keys (port 3011)
- Runs BullMQ dashboard for queue monitoring (port 3010)
- Sets up all necessary networks and volumes
- *(with `--profile apis`)* Launches the API container running the application (port 3000)

You can monitor the services as they start up:

```bash
# Check status of all containers
docker-compose ps

# Watch logs from all services
docker-compose logs -f
```

Compose health checks mark each service ready only after its check passes.


### Troubleshooting

- **Port conflicts**: Ensure ports 5432, 6379, 3010, 3011 are not in use by other applications
- **Host resolution issues**: Add `127.0.0.1 host.docker.internal` to your `/etc/hosts` file if needed
- **PostgreSQL startup**: Wait for the database health check to pass before running migrations or seeds
- **Permission issues**: Ensure Docker has proper permissions to create volumes and networks


## Secret Management with Vault (Optional)

Instead of hand-managing your `.env`, you can run an optional [HashiCorp Vault][ref-vault] server that holds your secrets and writes them into `.env` with one command. It is gated behind the `vault` Compose profile, so it never starts unless you opt in:

```bash
# Start Vault + run the one-shot bootstrap (seeds development from .env.example)
docker compose --profile vault up -d

# Pull the development secret into ./.env
pnpm vault:pull
```

The bundled config runs Vault with a persistent file backend, auto-initialized and auto-unsealed by the container entrypoint. Secrets are laid out per environment (`production`, `staging`, `development`) and read through a per-environment read-only AppRole. For the full architecture, KV layout, usage, and scope, see the [Vault Documentation][ref-doc-vault].


## Generate Database Client

`pnpm generate` writes the two gitignored generated sources the build imports:

- `pnpm db:generate` (`prisma generate`): the Prisma client, from `prisma/schema.prisma` into `src/generated/prisma-client` (ESM, the `prisma-client` generator)
- `pnpm generate:package`: `src/generated/package/package.ts`, the `version`, `author`, and `repository` fields of `package.json` that `app.config.ts` reads

```bash
pnpm generate
```

`pnpm typecheck`, `pnpm build`, and `pnpm start:dev` resolve imports from both files, so `pnpm generate` runs after `pnpm install` and again after every change to `prisma/schema.prisma` or those `package.json` fields. The CI lint workflow and both dockerfiles run it before building.

## Database Migration & Seeding

**Run PostgreSQL migrations:**
```bash
pnpm db:migrate
```

**Seed all initial data:**
```bash
pnpm migration:seed
```

**Remove all seeded data:**

> [!WARNING]
> `migration:remove` deletes more than the seeded rows: the `user` seed's removal deletes every user, session, and activity log in the database, and the API key, country, feature flag, role, and term policy seeds each delete their whole collection.

```bash
pnpm migration:remove
```

Every seeded row names the superadmin's fixed id (`MigrationUserSuperAdminId`) as its actor. When the database holds a superadmin created under a different id, `pnpm migration:seed` logs an error from the `user` seed and writes no user. Realigning it takes `pnpm migration:remove`, then `pnpm migration:seed`, which wipes the data above. Details: [Database Documentation][ref-doc-database].

**Reset the database and reseed from scratch:**

> [!WARNING]
> `migration:fresh` runs `prisma migrate reset --force`, which drops all existing data and re-applies every migration.

```bash
pnpm migration:fresh
```

**Seed email:**

Use this to seed email data for testing email sending features.

```bash
pnpm migration template-email-notification --type seed
```

**Seed term policies:**

Use this to seed term policies data.

```bash
pnpm migration template-termPolicy --type seed
```

For a complete guide and module details, see [Database Documentation][ref-doc-database].


## Run Project

Congratulations! You're now ready to start the project. Make sure all your services (PostgreSQL, Redis) are running before starting the application.

```bash
# Start in development mode with hot reload
pnpm start:dev
```

Production Commands

```bash
# Build the project for production
pnpm build

# Start in production mode
pnpm start:prod
```

## Development Tools

These commands run during development:

```bash
# Format code with Prettier
pnpm format

# Lint code with ESLint
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Run unit specs (`test/**/*.spec.ts`); does not collect coverage
pnpm test

# Same suite plus `--coverage` (100% thresholds then apply)
pnpm test:cov

# Type-check without emitting (also run by the pre-commit hook)
pnpm typecheck

# Check for dead/unused code
pnpm deadcode

# Spell check
pnpm spell
```

`pnpm test` is `TZ=UTC vitest run --passWithNoTests`. It does not collect coverage. `coverage.enabled` is `false` in `vitest.config.ts`. `pnpm test:cov` adds `--coverage`, which is when the 100% thresholds on branches, functions, lines, and statements apply. The suite is unit specs. Integration and e2e tests are not collected. `pre-commit` and CI (`.github/workflows/test.yml`, `workflow_dispatch`) run `NODE_ENV=test pnpm test`. `.github/workflows/linter.yml` runs on `pull_request`. `testTimeout` is 5000ms.

Here are useful commands for managing your dependencies:

```bash
# Check for outdated packages
pnpm package:check

# Upgrade all packages to their latest versions
pnpm package:upgrade

# Clean install (removes node_modules and reinstalls everything)
pnpm clean && pnpm install
```

> [!NOTE]
> The `pnpm clean` command is a custom script that removes `node_modules` directory, `dist` build folder, and pnpm cache before reinstalling. This is useful when you encounter dependency conflicts, build issues, or want a fresh installation.


## Accessing the Application

Endpoints and tools:

- **🌐 Base URL**: `http://localhost:3000`
  - Main API endpoint

- **📚 API Documentation**: `http://localhost:3000/docs`
  - Interactive Swagger/OpenAPI documentation
  - Test API endpoints directly in the browser
  - View request/response schemas

- **⚙️ Queue Dashboard**: `http://localhost:3010` *(Docker installation only)*
  - BullMQ board for monitoring background jobs and queues
  - Default credentials: `admin` / `admin123`
  - Monitor job status, retry failed jobs, and view queue statistics

To verify everything is working correctly:

1. **Test API**: Visit `http://localhost:3000/api/public/hello` for a simple API test
2. **API Docs**: Ensure `http://localhost:3000/docs` loads the Swagger interface
3. **Database Connection**: Check application logs for successful database connection
4. **Redis Connection**: Verify Redis connection in the application logs




<!-- REFERENCES -->

[ref-vault]: https://developer.hashicorp.com/vault

[ref-doc-environment]: environment.md
[ref-doc-database]: database.md
[ref-doc-configuration]: configuration.md
[ref-doc-vault]: vault.md
