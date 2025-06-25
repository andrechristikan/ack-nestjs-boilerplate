# Overview

This guide covers both standard installation and Docker-based setup of the ACK NestJS Boilerplate.

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Standard Installation](#standard-installation)
    - [Prerequisites](#prerequisites)
    - [Clone Repo](#clone-repo)
    - [Install Dependencies](#install-dependencies)
    - [Generate Keys](#generate-keys)
    - [Create Environment](#create-environment)
    - [Database Migration and Seed](#database-migration-and-seed)
    - [Template Migration](#template-migration)
    - [Run Project](#run-project)
  - [Installation with Docker](#installation-with-docker)
    - [Prerequisites](#prerequisites-1)
    - [Quick Start](#quick-start)
    - [Accessing the Application](#accessing-the-application)
    - [Database Migration and Seeding](#database-migration-and-seeding)
    - [Managing the Application](#managing-the-application)

## Standard Installation

### Prerequisites

Before starting, you need to install the following packages and tools.
I recommend using the LTS versions for all tools and packages.

> Always verify that the tools have been installed successfully.

1. [NodeJs](http://nodejs.org) (v22.16.0 or later)
2. [MongoDB](https://docs.mongodb.com/) (v8.x)
3. [Redis](https://redis.io) (v8.x)
4. [Yarn](https://yarnpkg.com) (v1.22.x)
5. [Git](https://git-scm.com) (v2.39.x)

### Clone Repo

Clone the project with git:

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
```

### Install Dependencies

Install all required dependencies using Yarn:

```bash
yarn install
```

**Package Management Commands:**
```bash
# Check for outdated packages
yarn package:check

# Upgrade all packages to latest versions
yarn package:upgrade

# Clean install (removes node_modules and reinstalls)
yarn clean && yarn install
```

### Generate Keys

Since version `7.4.0`, the project uses the `ES512` algorithm for JWT authentication. You need to generate both `private-key` and `public-key` pairs for access-token and refresh-token:

```bash
yarn generate:keys
```

This command will generate the necessary keys in the `/keys` directory, along with a `jwks.json` file that follows the JSON Web Key Set (JWKS) standard.

Upload the `jwks.json` file to AWS S3 or any publicly accessible server, and make note of the URL as you'll need it for your environment configuration.

For convenience, after running `yarn generate:keys`, the generated key IDs (kids) will be automatically updated in your `.env` file (if it does not exist, it will be created by copying from `.env.example`).

### Create Environment

Create your environment file by copying the example:

```bash
cp .env.example .env
```

When configuring your `.env` file, pay particular attention to:
- The URL where you've hosted the `jwks.json` file
- The `kid` (Key ID) values for both access token and refresh token
- Database connection settings
- Redis configuration for caching and queues

These settings are essential for authentication and overall system functionality.

### Database Migration and Seed

By default, `AutoCreate` and `AutoIndex` options are set to `true`, meaning MongoDB schemas will automatically update with code changes.

First, you need to run the project and wait until the schema migration is complete.

Then, populate the database with initial data:

```bash
yarn migrate:seed
```

If you need to roll back the migrations:

```bash
yarn migrate:remove
```

For a complete reset and rebuild of the database:

```bash
yarn migrate:fresh
```

### Template Migration

> Optional

If you're using email templates with AWS SES:

```bash
yarn migrate:template
```

To roll back template changes:

```bash
yarn rollback:template
```

### Run Project

Now you're ready to start the project:

```bash
yarn start:dev
```

**Additional Run Commands:**
```bash
# Production mode
yarn start:prod

# Standard start (without watch mode)
yarn start

# Build the project
yarn build

# Development with clean terminal
yarn start:dev
```

**Development Tools:**
```bash
# Format code
yarn format

# Lint code
yarn lint

# Lint and auto-fix issues
yarn lint:fix

# Run tests
yarn test

# Check for dead/unused code
yarn deadcode

# Spell check
yarn spell
```

## Installation with Docker

Docker provides a streamlined way to set up the entire application environment with all dependencies pre-configured, including MongoDB replica set, Redis, and JWKS server.

### Prerequisites

1. [Docker](https://docs.docker.com) (v27.4.x or later)
2. [Docker Compose](https://docs.docker.com/compose/) (v2.31.x or later)

### Quick Start

The Docker setup has been optimized for simplicity. Follow these steps:

1. **Generate JWT Keys** (Required for authentication):
   ```bash
   yarn generate:keys
   ```

   When using Docker, there's no need to upload the JWKS file to an external server. The Docker setup includes a dedicated NGINX container that serves the JWKS file. After generating the keys, you should:
   
   - Make sure the `jwks.json` file is in the `/keys` directory
   - In your `.env` file, set `AUTH_JWT_JWKS_URI` to `http://jwks-server:3011/.well-known/jwks.json` for internal container communication
   - From outside Docker, the JWKS file will be accessible at `http://localhost:3011/.well-known/jwks.json`

2. **Setup Environment**:
   ```bash
   cp .env.example .env
   ```
   
   When editing your `.env` file for Docker usage, ensure that:
   - Database connections point to the Docker service names (e.g., `mongodb*` instead of `localhost`)
   - Redis connections point to the Docker service name (e.g., `redis` instead of `localhost`)
   - The JWKS URI is configured properly as mentioned above
   - The `kid` (Key ID) values for both access token and refresh token

3. **Start All Services**:
   ```bash
   docker-compose up -d
   ```

> **Note**: If you encounter `host.docker.internal` resolution issues, add `127.0.0.1 host.docker.internal` to your `/etc/hosts` file.

### Accessing the Application

Once all containers are healthy and running, you can access:

- **Main Application**: `http://localhost:3000`
  - API endpoints and main functionality
- **API Documentation**: `http://localhost:3000/docs` 
  - Interactive Swagger/OpenAPI documentation
- **Queue Dashboard**: `http://localhost:3010`
  - BullMQ board for monitoring background jobs and queues
  - Default credentials: `admin` / `admin123`
- **JWKS Endpoint**: `http://localhost:3011/.well-known/jwks.json`
  - JSON Web Key Set for JWT token validation

The Docker setup includes health checks for all services, ensuring they're fully ready before marking as available.

### Database Migration and Seeding

The Docker setup automatically configures MongoDB with replica set support. To populate the database with initial data:

```bash
# Seed the database with initial data (countries, roles, users, etc.)
docker-compose exec apis yarn migrate:seed
```

**Additional Migration Commands:**

```bash
# Reset and rebuild the entire database from scratch
docker-compose exec apis yarn migrate:fresh

# Remove all seeded data (rollback migrations)
docker-compose exec apis yarn migrate:remove

# Migrate AWS SES email templates (optional)
docker-compose exec apis yarn migrate:template

# Rollback email template migrations
docker-compose exec apis yarn rollback:template
```

> **Note**: The `migrate:fresh` command will completely reset your database, removing all existing data.

### Managing the Application

**Viewing Logs:**
```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f apis
docker-compose logs -f mongo
docker-compose logs -f redis
```

**Stopping Services:**
```bash
# Stop all services (preserves data)
docker-compose down

# Stop and remove all volumes (⚠️ deletes all database data)
docker-compose down -v
```
