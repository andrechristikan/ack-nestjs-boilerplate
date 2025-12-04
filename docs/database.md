# Database Documentation

> This documentation explains the features and usage of **Database Module**: Located at `src/common/database`

## Overview

This documentation explains the database architecture and features in the ACK NestJS Boilerplate project:

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
- [Database Tools](#database-tools)
	- [Prisma ORM](#prisma-orm)
	- [Why Prisma for Repository Design Pattern?](#why-prisma-for-repository-design-pattern)
	- [Database Flexibility & Project-Specific Adjustments](#database-flexibility--project-specific-adjustments)


## Prerequisites

- **MongoDB 8.0.x** running as a **replica set** (required for transactions)

> **💡 Tip:** Use Docker setup from the installation guide for automatic MongoDB replica set configuration.


## Migration

Prisma does not support migrations for MongoDB. Instead, use `prisma db push` to sync your Prisma schema with the MongoDB database.

In this project, you can use the `yarn db:migrate` script to quickly sync your schema to MongoDB.

For details, see the official Prisma documentation: [Prisma for MongoDB][ref-prisma-mongodb]


## Generate Database Client

Prisma uses a generated client to provide type-safe database access and query building. You must generate the Prisma Client every time you change your Prisma schema (`prisma/schema.prisma`).

**Why Generate Prisma Client?**
- The Prisma Client is an auto-generated library that lets your application interact with the database using the models and types defined in your Prisma schema.
- It ensures type safety and up-to-date queries for your database operations.

**When to Run This Command?**
- After any change to your Prisma schema (e.g., adding, removing, or updating models/fields).
- After pulling schema changes from version control.

**How to Generate Prisma Client:**
```bash
yarn db:generate
```

This command will read your Prisma schema and generate the client code in `node_modules/@prisma/client`. The generated client is required for your application to interact with the database using Prisma.


## Seeding

Seeding in this project is handled using [Commander.js][ref-commander]. All seed commands are implemented in `src/migration/seeds.*`.

### Database Seeds


This project provides ready-to-use seed scripts to help you quickly initialize or remove data for development and testing. Database seeding is used to populate the database with initial or test data, making development and testing easier.

**Seed Data Location:**
- All seed data is stored in `src/migration/data/*`.

**How to Run All Seeds:**
- `yarn migration:seed` — runs all seed commands to populate initial data.
- `yarn migration:remove` — removes all seeded data from the database.

**How to Seed/Remove a Specific Module:**
Run the command:
   - Seed: `yarn migration {module} --type seed`
   - Remove: `yarn migration {module} --type remove`

**Available Types:**
- `seed` (add data)
- `remove` (delete data)

**Available Modules:**

- `apiKey`: Inserts default and system API keys for authentication and service access.
- `country`: Inserts country data (name, codes, phone code, continent, timezone).
- `featureFlag`: Inserts feature flags to enable/disable features (e.g., login methods, sign up, change password).
- `role`: Inserts user roles (superadmin, admin, user) with abilities and permissions.
- `termPolicy`: Inserts term policy documents (cookie, marketing, privacy, terms of service) with version and content.
- `user`: Inserts initial user accounts (Super Admin, Admin, User) with country, role, and credentials.


### Template Seeds

Template seeding uses the **same script and commands as Database Seeds**, but is specifically for email templates.

Every time you run the email template seed, the templates will be inserted into AWS SES automatically.

**How to Run Template Seeds:**
- Seed: `yarn migration email --type seed`
- Remove: `yarn migration email --type remove`

**Available Types:**
- `seed` (add email template data)
- `remove` (delete email template data)


## Initial Seeded Data

When you run `yarn migration:seed`, the following initial data will be created in your database. This data is essential for testing and development purposes.

### API Keys

Two API keys are created for authentication and service access:

| Name | Type | Key | Secret | Usage |
|------|------|-----|--------|-------|
| Api Key Default | `default` | `fyFGb7ywyM37TqDY8nuhAmGW5` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For general API access |
| Api Key System | `system` | `UTDH0fuDMAbd1ZVnwnyrQJd8Q` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For system-level operations |

> **Security Note**: These are development keys. Always regenerate API keys for production environments.

### Roles

Three user roles are created with different permission levels:

| Role | Type | Description | Abilities |
|------|------|-------------|-----------|
| superadmin | `superAdmin` | Super Admin Role | Full system access (unrestricted) |
| admin | `admin` | Admin Role | All CRUD operations on all subjects |
| user | `user` | User Role | Limited access (no special abilities) |

**Admin Role Abilities**: The admin role has full CRUD permissions (`create`, `read`, `update`, `delete`) on all policy subjects defined in the system.

### Users

Three test users are created, one for each role:

| Email | Name | Role | Password | Country |
|-------|------|------|----------|---------|
| superadmin@mail.com | Super Admin | superadmin | `aaAA@123` | ID (Indonesia) |
| admin@mail.com | Admin | admin | `aaAA@123` | ID (Indonesia) |
| user@mail.com | User | user | `aaAA@123` | ID (Indonesia) |

> **Security Warning**: These are test accounts with default passwords. Change or remove these accounts in production environments.

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
| `cookie` | 1 | EN | Cookie policy document |
| `marketing` | 1 | EN | Marketing terms document |
| `privacy` | 1 | EN | Privacy policy document |
| `termsOfService` | 1 | EN | Terms of Service document |

> **Note**: The actual content for these policies is stored as file references. You need to upload the actual policy documents to your storage service and update the content keys accordingly.

**Data Location**: All seed data configurations can be found in `src/migration/data/*` directory.


## Database Tools

### **Prisma ORM**

This project uses **[Prisma][ref-prisma] v6.19.x** as the primary database toolkit. Prisma is not just an ORM - it's a complete database toolkit that provides the foundation for implementing clean architecture patterns.

> **Note**: This project currently uses Prisma v6

### **Why Prisma for Repository Design Pattern?**

Prisma perfectly enables this project's **Repository Design Pattern** implementation:

- **Type-Safe Repository Layer**: Auto-generated TypeScript types ensure compile-time validation throughout repositories
- **Clean Architecture**: PrismaClient provides foundation for clean separation between database and business logic  
- **Easy Implementation**: Consistent query API and transaction support simplify repository development
- **Database Agnostic**: Switch between MongoDB, PostgreSQL, MySQL, SQLite without changing repository code

### Database Flexibility & Project-Specific Adjustments

With Prisma and the Repository Pattern, switching databases is straightforward. For example, to move from MongoDB to PostgreSQL, update the datasource configuration and regenerate the Prisma Client. Repository and business logic code do not need changes.


In this project, some adjustments are needed:
- `DatabaseService`: May require updates for database-specific features (e.g., connection management, health checks, logging) when switching from MongoDB to PostgreSQL.
- `DatabaseUtil`: Contains utilities for MongoDB-specific needs (such as ObjectID handling and data conversion) and will need to be updated or replaced with PostgreSQL-specific utilities if you switch databases.

For details on switching databases, see: [Prisma: Switching databases][ref-prisma-setup]



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
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
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
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md