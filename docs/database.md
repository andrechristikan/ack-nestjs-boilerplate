# Database Documentation

This documentation explains the features and usage of **Database Module**: Located at `src/common/database`

## Overview

This documentation explains the database architecture and features in ACK NestJS Boilerplate:

## Related Documents

- [Installation Documentation][ref-doc-installation] - For complete project setup and dependencies
- [Environment Documentation][ref-doc-environment] - For database connection and environment variables
- [Configuration Documentation][ref-doc-configuration] - For understanding the config module structure

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Migration](#migration)
- [Generate Database Client](#generate-database-client)
- [Seeding](#seeding)
	- [Database Seeds](#database-seeds)
	- [Template Seeds](#template-seeds)
- [Initial Seeded Data](#initial-seeded-data)
	- [API Keys](#api-keys)
	- [Roles](#roles)
	- [Users](#users)
	- [Feature Flags](#feature-flags)
	- [Term Policies](#term-policies)
- [Docker](#docker)
- [Database Tools](#database-tools)
	- [Prisma ORM](#prisma-orm)
	- [Why Prisma for Repository Design Pattern?](#why-prisma-for-repository-design-pattern)
	- [Change DB with Minimal Effort](#change-db-with-minimal-effort)


## Prerequisites

> **💡 Tip:** Use Docker setup from the installation guide for automatic MongoDB replica set configuration.

**MongoDB 8.0.x** running as a **replica set** (required for transactions)

## Migration

Prisma does not support migrations for MongoDB. Instead, use `prisma db push` to sync your Prisma schema with the MongoDB database.

In ACK NestJS Boilerplate, you can use the `pnpm db:migrate` script to quickly sync your schema to MongoDB.

For details, see the official Prisma documentation: [Prisma for MongoDB][ref-prisma-mongodb]


## Generate Database Client

Prisma uses a generated client to provide type-safe database access and query building. You must generate the Prisma Client every time you change your Prisma schema (`prisma/schema.prisma`).

**When to Generate Prisma client?**
- After any change to your Prisma schema (e.g., adding, removing, or updating models/fields).
- After pulling schema changes from version control.

**How to Generate Prisma Client:**
```bash
pnpm db:generate
```

This command will read your Prisma schema and generate the client code in `generated/prisma-client`. The generated client is required for your application to interact with the database using Prisma.


## Seeding

Seeding in ACK NestJS Boilerplate is handled using [Commander.js][ref-commander]. All seed commands are implemented in `src/migration/seeds/*`.

### Database Seeds

ACK NestJS Boilerplate provides ready-to-use seed scripts to help you quickly initialize or remove data for development and testing. Database seeding is used to populate the database with initial or test data, making development and testing easier.

**Seed Data Location:**
- All seed data is stored in `src/migration/data/*`.

**How to Run All Seeds:**
- `pnpm migration:seed` — runs all seed commands to populate initial data.
- `pnpm migration:remove` — removes all seeded data from the database.

**How to Seed/Remove a Specific Module:**
Run the command:
   - Seed: `pnpm migration {module} --type seed`
   - Remove: `pnpm migration {module} --type remove`

**Available Types:**
- `seed` (add data)
- `remove` (delete data)

**Available Modules:**

- `apiKey`: Inserts default and system API keys for authentication and service access.
- `country`: Inserts country data (name, codes, phone code, continent, timezone).
- `featureFlag`: Inserts feature flags to enable/disable features (e.g., login methods, sign up, change password).
- `role`: Inserts user roles (superadmin, admin, user) with abilities and permissions.
- `termPolicy`: Inserts term policy documents (cookies, marketing, privacy, terms of service) with version and content.
- `user`: Inserts initial user accounts (Super Admin, Admin, User) with country, role, and credentials.


### Template Seeds

Template seeding uses the same script and commands as Database Seeds, but is specifically for template files like email and term policies.

**Available Types:**
- `seed` (add template data)
- `remove` (delete template data)

#### Email Templates

Every time you run the email template seed, the templates will be inserted into AWS SES automatically.

**How to Run Email Template Seeds:**
- Seed: `pnpm migration template-email --type seed`
- Remove: `pnpm migration template-email --type remove`

#### Term Policy Templates

Every time you run the term policy template seed, the policy documents will be linked to the database records automatically.

**How to Run Term Policy Template Seeds:**
- Seed: `pnpm migration template-termPolicy --type seed`
- Remove: `pnpm migration template-termPolicy --type remove`


## Initial Seeded Data

When you run `pnpm migration:seed`, the following initial data will be created in your database. This data is essential for testing and development purposes.

### API Keys

> ⚠️ These are development keys. Always regenerate API keys for production environments.

Two API keys are created for authentication and service access:

| Name | Type | Key | Secret | Usage |
|------|------|-----|--------|-------|
| Api Key Default | `default` | `fyFGb7ywyM37TqDY8nuhAmGW5` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For general API access |
| Api Key System | `system` | `UTDH0fuDMAbd1ZVnwnyrQJd8Q` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For system-level operations |

**API Key Prefix Convention:**

All generated API keys automatically include an environment prefix to help identify which environment they belong to. The format is:

```
{environment}_{random_string}
```

**Examples:**
- `local_abc123xyz` - API key for local/development environment
- `development_def456uvw` - API key for development environment
- `staging_ghi789rst` - API key for staging environment
- `production_jkl012mno` - API key for production environment

This prefix is automatically added based on the `APP_ENV` environment variable when creating new API keys, ensuring easy identification and preventing accidental cross-environment usage.

### Roles

Three user roles are created with different permission levels:

| Role | Type | Description | Abilities |
|------|------|-------------|-----------|
| superadmin | `superAdmin` | Super Admin Role | Full system access (unrestricted) |
| admin | `admin` | Admin Role | All CRUD operations on all subjects |
| user | `user` | User Role | Limited access (no special abilities) |

**Admin Role Abilities**: The admin role has full CRUD permissions (`create`, `read`, `update`, `delete`) on all policy subjects defined in the system.

### Users

> ⚠️ These are test accounts with default passwords. Change or remove these accounts in production environments.

Three test users are created, one for each role:

| Email | Name | Role | Password | Country |
|-------|------|------|----------|---------|
| superadmin@mail.com | Super Admin | superadmin | `aaAA@123` | ID (Indonesia) |
| admin@mail.com | Admin | admin | `aaAA@123` | ID (Indonesia) |
| user@mail.com | User | user | `aaAA@123` | ID (Indonesia) |

### Feature Flags

Five feature flags are created to control authentication and user features:

| Key | Description | Enabled | Rollout | Metadata |
|-----|-------------|---------|---------|----------|
| `loginWithGoogle` | Enable login with Google | ✅ Yes | 100% | `signUpAllowed: true` |
| `loginWithApple` | Enable login with Apple | ✅ Yes | 100% | `signUpAllowed: true` |
| `loginWithCredential` | Enable login with Credential | ✅ Yes | 100% | - |
| `signUp` | Enable user sign up | ✅ Yes | 100% | - |
| `changePassword` | Enable change password feature | ✅ Yes | 100% | `forgotAllowed: true` |

All features are enabled by default with 100% rollout for development convenience.

### Term Policies

Four term policy documents are created:

| Type | Version | Language | Description |
|------|---------|----------|-------------|
| `cookies` | 1 | EN | Cookie policy document |
| `marketing` | 1 | EN | Marketing terms document |
| `privacy` | 1 | EN | Privacy policy document |
| `termsOfService` | 1 | EN | Terms of Service document |

The actual content for these policies is stored as file references in `src/migration/data/term-policy/*`. The files are not automatically linked to the database records. You must run the term policy migration script to link the files and update the content keys in the database.

For more details on how seeding works, see: [Template Seeds](#template-seeds)


## Docker

Running database commands inside Docker containers from your host machine:

**Generate Prisma Client inside container:**
```bash
docker-compose exec apis pnpm db:generate
```

**Run database migration inside container:**
```bash
docker-compose exec apis pnpm db:migrate
```

**Run all seeds inside container:**
```bash
docker-compose exec apis pnpm migration:seed
```

**Remove all seeded data inside container:**
```bash
docker-compose exec apis pnpm migration:remove
```

These commands execute directly in the running Docker container without needing to enter the container shell. Ensure Docker Compose is running with `docker-compose up -d` before executing these commands.

## Database Tools

### **Prisma ORM**

ACK NestJS Boilerplate uses **[Prisma][ref-prisma] v6.19.x** as the primary database toolkit. Prisma is not just an ORM - it's a complete database toolkit that provides the foundation for implementing clean architecture patterns.

### **Why Prisma for Repository Design Pattern?**

Prisma perfectly enables ACK NestJS Boilerplate's **Repository Design Pattern** implementation:

- **Type-Safe Repository Layer**: Auto-generated TypeScript types ensure compile-time validation throughout repositories
- **Clean Architecture**: PrismaClient provides foundation for clean separation between database and business logic  
- **Easy Implementation**: Consistent query API and transaction support simplify repository development
- **Database Agnostic**: Switch between MongoDB, PostgreSQL, MySQL, SQLite without changing repository code

### Change DB with Minimal Effort

Prisma, combined with the Repository Pattern, allows you to switch databases with minimal effort and maximum codebase stability. The data access layer is fully abstracted, so your service and business logic remain unchanged regardless of the underlying database engine.

#### Supported Databases

| Database | Best For | Transaction Support |
|----------|----------|---------------------|
| **MongoDB** | Document-based, flexible schema | ✅ Yes (replica set) |
| **PostgreSQL** | Production apps, complex queries | ✅ Yes |

**Other supported databases:** MySQL, SQLite, SQL Server, CockroachDB

#### Quick Migration: MongoDB → PostgreSQL

**1. Update Prisma Schema** (`prisma/schema.prisma`):
```prisma
// Change provider
datasource db {
  provider = "postgresql"  // was: "mongodb"
  url      = env("DATABASE_URL")
}

// Update ID fields in all models
model User {
  id String @id @default(uuid())  // was: @default(auto()) @map("_id") @db.ObjectId
  // Remove @db.ObjectId from all foreign keys
}
```

**2. Update Environment** (`.env`):
```bash
# From:
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?replicaSet=rs0

# To:
DATABASE_URL=postgresql://user:password@localhost:5432/ACKNestJs
```

**3. Generate Migration & Client:**
```bash
pnpm prisma migrate dev --name init  # PostgreSQL
pnpm db:generate                      # Regenerate client
```

**4. Update Database-Specific Code:**

- **DatabaseService** (`src/common/database/services/database.service.ts`) - May require updates for connection management, health checks, and database-specific features
- **DatabaseUtil** (`src/common/database/utils/database.util.ts`) - Replace MongoDB `ObjectId` helpers with UUID validators

**5. Re-seed Database:**
```bash
pnpm migration:seed
```

#### Learn More

- [Prisma: Switching Databases][ref-prisma-setup]
- [Prisma MongoDB Documentation][ref-prisma-mongodb]
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)


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

<!-- DOCUMENTS -->

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
[ref-contributor-ak2g]: https://github.com/ak2g
