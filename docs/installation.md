# Installation Documentation

## Overview

This document provides step-by-step instructions for setting up the ACK NestJS Boilerplate on your development environment.

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
- [🔧 Standard Installation](#-standard-installation)
  - [Install Packages](#install-packages)
  - [Create Environment](#create-environment)
  - [Generate Keys](#generate-keys)
- [🐳 Installation with Docker](#-installation-with-docker)
  - [What's Included](#whats-included)
  - [Prerequisites](#prerequisites-1)
  - [Create Environment](#create-environment-1)
  - [Generate Keys](#generate-keys-1)
  - [Run Containers](#run-containers)
  - [Troubleshooting](#troubleshooting)
- [Generate Database Client](#generate-database-client)
- [Database Migration & Seeding](#database-migration--seeding)
- [Run Project](#run-project)
- [Development Tools](#development-tools)
- [Accessing the Application](#accessing-the-application)


## Prerequisites

> **Note**: ACK NestJS Boilerplate uses PNPM for package management. All documentation examples will use PNPM commands.

Before starting, install the following tools and packages. We recommend using the LTS (Long Term Support) versions for stability and compatibility.

### Required Tools

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org) | v24.11.0+ |
| [MongoDB](https://docs.mongodb.com/) | v8.0.x |
| [Redis](https://redis.io) | v8.x |
| [PNPM](http://pnpm.io) | v10.25.x |
| [Git](https://git-scm.com) | v2.39.x |

> **Important**: MongoDB must be configured to run as a **replica set** for database transactions to work properly. You can either use [Docker installation](#installation-with-docker) for automatic setup or create a database on [MongoDB Atlas][ref-mongodb] which supports replica sets by default.

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

## 🔧 Standard Installation

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

> **For comprehensive environment configuration details**, refer to the [Environment Documentation][ref-doc-environment].

### Generate Keys

ACK NestJS Boilerplate uses **ES256** algorithm for Access Tokens and **ES512** for Refresh Tokens. You need to generate cryptographic key pairs for JWT authentication.

#### Generate Key Pairs

> ⚠️ **Security Warning**: Always backup your existing keys before regenerating. There is no way to rollback once new keys are generated and old tokens will become invalid.

```bash
# Generate keys and JWKS files
pnpm generate:keys

# Or automatically update .env with key IDs (development only)
pnpm generate:keys --direct-insert
```

**What this command does:**
- Creates private/public key pairs for both access and refresh tokens
- Generates JWKS (JSON Web Key Set) files in `/keys` directory
- Creates `access-jwks.json` and `refresh-jwks.json` for public key distribution
- With `--direct-insert` flag: Automatically updates your `.env` file with generated key IDs

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
AUTH_JWT_ACCESS_TOKEN_JWKS_URI="https://your-domain.com/.well-known/access-jwks.json"
AUTH_JWT_REFRESH_TOKEN_JWKS_URI="https://your-domain.com/.well-known/refresh-jwks.json"
```


## 🐳 Installation with Docker

> **Note:** You can skip this section if all dependencies are already installed and you do not want to use Docker for your setup.

Docker provides the fastest and most reliable way to set up the ACK NestJS Boilerplate. This method automatically configures the entire development environment with all dependencies and services pre-configured.

### What's Included

The Docker setup provides:
- **MongoDB replica set** - Configured for transactions
- **Redis instances** - Separate instances for caching and queues
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

> **Note**: The Docker setup automatically handles service networking and JWKS hosting, making configuration simpler than manual setup.

For Docker installation, ensure these specific values in your `.env` file:

**Database Configuration:**
```bash
# MongoDB (Docker containers)
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?retryWrites=true&w=majority&replicaSet=rs0
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

> **For comprehensive environment configuration details**, refer to the [Environment Documentation][ref-doc-environment].

### Generate Keys

Key generation for Docker installation follows the same process as standard installation, but with automatic Docker-hosted JWKS serving.

#### Generate Key Pairs

> ⚠️ **Security Warning**: Always backup your existing keys before regenerating. There is no way to rollback once new keys are generated and old tokens will become invalid.

```bash
# Generate keys and automatically update .env with key IDs (recommended for Docker)
pnpm generate:keys --direct-insert
```

**What this command does:**
- Creates private/public key pairs for both access and refresh tokens
- Generates JWKS (JSON Web Key Set) files in `/keys` directory
- Creates `access-jwks.json` and `refresh-jwks.json` for Docker container serving
- With `--direct-insert` flag: Automatically updates your `.env` file with generated key IDs

#### Docker JWKS Hosting

Unlike standard installation, Docker automatically serves your JWKS files through a dedicated container:

- **Access JWKS**: `http://localhost:3011/.well-known/access-jwks.json`
- **Refresh JWKS**: `http://localhost:3011/.well-known/refresh-jwks.json`

The Docker setup includes a JWKS server that automatically hosts the generated key files, eliminating the need for external hosting.

### Run Containers

Now you're ready to start the complete Docker environment with all services.

> **Note**: By default, Docker installation only sets up dependencies (MongoDB, Redis, JWKS server, BullMQ dashboard). The API container is not included. To also run the API container, use the `full` profile.

**Start only dependencies:**
```bash
# Start MongoDB, Redis, JWKS, and BullMQ dashboard
docker-compose up -d
```

**Start with API container (recommended for full development setup):**
```bash
# Start all services including the API container
docker-compose up -d
```

**What this command does:**
- Starts MongoDB replica set with 1 nodes (ports 27017)
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

The Docker setup includes comprehensive health checks for all services, ensuring they're fully operational before marking as available.


### Troubleshooting

- **Port conflicts**: Ensure ports 27017, 6379, 3010, 3011 are not in use by other applications
- **Host resolution issues**: Add `127.0.0.1 host.docker.internal` to your `/etc/hosts` file if needed
- **MongoDB replica set initialization**: Wait 1-2 minutes for complete setup
- **Permission issues**: Ensure Docker has proper permissions to create volumes and networks


## Generate Database Client

Prisma uses a generated client to provide type-safe database access and query building. You must generate the Prisma Client every time you change your Prisma schema (in `prisma/schema.prisma`).

**Generate database client from Prisma Schema:**
```bash
pnpm db:generate
```

## Database Migration & Seeding

**Migrate schema to MongoDB:**
```bash
pnpm db:migrate
```

**Seed all initial data:**
```bash
pnpm migration:seed
```

**Seed email:**

Use this to seed email data for testing email sending features.

```bash
pnpm migration template-email --type seed
```

**Seed term policies:**

Use this to seed term policies data.

```bash
pnpm migration template-termPolicy --type seed
```

For a complete guide and module details, see [Database Documentation][ref-doc-database].


## Run Project

Congratulations! You're now ready to start the project. Make sure all your services (MongoDB, Redis) are running before starting the application.

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

These commands help maintain code quality during development:

```bash
# Format code with Prettier
pnpm format

# Lint code with ESLint
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Run tests
pnpm test

# Check for dead/unused code
pnpm deadcode

# Spell check
pnpm spell
```

Here are useful commands for managing your dependencies:

```bash
# Check for outdated packages
pnpm package:check

# Upgrade all packages to their latest versions
pnpm package:upgrade

# Clean install (removes node_modules and reinstalls everything)
pnpm clean && pnpm install
```

> **Note**: The `pnpm clean` command is a custom script that removes `node_modules` directory, `dist` build folder, and pnpm cache before reinstalling. This is useful when you encounter dependency conflicts, build issues, or want a fresh installation.


## Accessing the Application

Once your application is successfully running, you can access various endpoints and tools:

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

1. **Test API**: Visit `http://localhost:3000/api/hello` for a simple API test
2. **API Docs**: Ensure `http://localhost:3000/docs` loads the Swagger interface
3. **Database Connection**: Check application logs for successful database connection
4. **Redis Connection**: Verify Redis connection in the application logs




<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[pnpm-shield]: https://img.shields.io/badge/pnpm-%232C8EBB.svg?style=for-the-badge&logo=pnpm&logoColor=white&color=F9AD00
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-types]: https://docs.nestjs.com/openapi/types-and-parameters
[ref-prisma]: https://www.prisma.io
[ref-prisma-mongodb]: https://www.prisma.io/docs/orm/overview/databases/mongodb#commonalities-with-other-database-provider
[ref-prisma-setup]: https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project#switching-databases
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-pnpm]: https://pnpm.io
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

[ref-doc-root]: ../readme.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-cache]: cache.md
[ref-doc-configuration]: configuration.md
[ref-doc-database]: database.md
[ref-doc-environment]: environment.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-installation]: installation.md
[ref-doc-logger]: logger.md
[ref-doc-message]: message.md
[ref-doc-pagination]: pagination.md
[ref-doc-project-structure]: project-structure.md
[ref-doc-queue]: queue.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-doc]: doc.md
[ref-doc-third-party-integration]: third-party-integration.md
[ref-doc-presign]: presign.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-two-factor]: two-factor.md

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
