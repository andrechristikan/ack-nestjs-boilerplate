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
    - [Setup Steps](#setup-steps)
    - [Start the Application](#start-the-application)
    - [Accessing the Application](#accessing-the-application)
    - [Database Migration and Seed](#database-migration-and-seed-1)
    - [Viewing Logs](#viewing-logs)
    - [Stopping the Application](#stopping-the-application)

## Standard Installation

### Prerequisites

Before starting, you need to install the following packages and tools.
I recommend using the LTS versions for all tools and packages.

> Always verify that the tools have been installed successfully.

1. [NodeJs](http://nodejs.org) (v22.13.x or later)
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

Install all required dependencies:

```bash
yarn install
```

### Generate Keys

Since version `7.4.0`, the project uses the `ES512` algorithm for JWT authentication. You need to generate both `private-key` and `public-key` pairs for access-token and refresh-token:

```bash
yarn generate:keys
```

This command will generate the necessary keys in the `/keys` directory, along with a `jwks.json` file that follows the JSON Web Key Set (JWKS) standard.

Upload the `jwks.json` file to AWS S3 or any publicly accessible server, and make note of the URL as you'll need it for your environment configuration.

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

For production environments:

```bash
yarn start:prod
```

## Installation with Docker

Docker provides an easy way to set up the entire application environment with minimal configuration.

### Prerequisites

1. [Docker](https://docs.docker.com) (v27.4.x or later)
2. [Docker-Compose](https://docs.docker.com/compose/) (v2.31.x or later)

### Setup Steps

Before running with Docker, you need to complete two important steps:

1. Generate JWT keys as described in the [Generate Keys](#generate-keys) section:
   ```bash
   yarn generate:keys
   ```

   When using Docker, there's no need to upload the JWKS file to an external server. The Docker setup includes a dedicated NGINX container that serves the JWKS file. After generating the keys, you should:
   
   - Make sure the `jwks.json` file is in the `/keys` directory
   - In your `.env` file, set `AUTH_JWT_JWKS_URI` to `http://jwks-server:3011/.well-known/jwks.json` for internal container communication
   - From outside Docker, the JWKS file will be accessible at `http://localhost:3011/.well-known/jwks.json`

2. Create and configure your environment file:
   ```bash
   cp .env.example .env
   ```
   
   When editing your `.env` file for Docker usage, ensure that:
   - Database connections point to the Docker service names (e.g., `mongodb` instead of `localhost`)
   - Redis connections point to the Docker service name (e.g., `redis` instead of `localhost`)
   - The JWKS URI is configured properly as mentioned above
   - The `kid` (Key ID) values for both access token and refresh token

### Start the Application

Run the application using Docker Compose:

```bash
docker-compose up -d
```

> **Note**: If `host.docker.internal` cannot be resolved, add a line in your `/etc/hosts` file to map `host.docker.internal` to `127.0.0.1`

### Accessing the Application

Once the containers are running, you can access:
- The main application at `http://localhost:3000`
- Swagger documentation at `http://localhost:3000/docs`
- BullMQ board at `http://localhost:3010`
- JwksServer at `http://localhost:3011`

> **Note**: BullMQ board and JwksServer only available with docker installation

### Database Migration and Seed

When using Docker, you can run database migrations and seeds directly from within the app container:

```bash
# Populate with initial data
docker-compose exec apis yarn migrate:seed

# For a complete reset and rebuild
docker-compose exec apis yarn migrate:fresh

# To roll back migrations
docker-compose exec apis yarn migrate:remove
```

### Viewing Logs

To view logs from the running containers:

```bash
docker-compose logs -f apis
```

### Stopping the Application

To stop all services:

```bash
docker-compose down
```

To stop and remove all data volumes (this will delete your database data):

```bash
docker-compose down -v
```