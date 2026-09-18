# Project Structure Documentation

## Overview

ACK NestJS Boilerplate is a NestJS application organized around the `repository design pattern` and a modular layout. 

## Table of Contents

- [Overview](#overview)
- [Structure](#structure)
- [App Module](#app-module)
- [Common Module](#common-module)
- [Configs](#configs)
- [Languages](#languages)
- [Migration](#migration)
- [Queues](#queues)
- [Router](#router)
- [Instrument](#instrument)
- [Migration Entrypoint](#migration-entrypoint)
- [Modules](#modules)
- [Other Modules](#other-modules)
    - [Folders](#folders)
    - [Files](#files)

## Structure

Below is an overview of the main project structure:

```
src
  ├── app
  ├── common
  ├── configs
  ├── languages
  ├── migration
  ├── modules
  ├── router
  ├── queues
  ├── instrument.ts
  ├── main.ts
  ├── migration.ts
  └── swagger.ts
```

```

## App Module

**Location:** `src/app/app.module.ts`

The App Module is the root module. It:
- Imports `CommonModule` (shared infrastructure and global feature modules) and `RouterModule` (HTTP route mounting and the queue processor mount).
- Registers five global exception filters: general, application, HTTP, validation, and import validation.

## Common Module

**Location:** `src/common/common.module.ts`

CommonModule registers shared infrastructure and the global feature modules. It configures:
- Global configuration management (using `ConfigModule` and custom configs)
- Caching and queueing (Redis, BullMQ)
- Logging (LoggerModule)
- Database access (DatabaseModule)
- Authentication and authorization (`AuthDomainModule`, `PolicyDomainModule`, `RoleDomainModule`, `ApiKeyDomainModule`, `FeatureFlagDomainModule`, `TermPolicyDomainModule`, `SessionDomainModule`, `ActivityLogDomainModule`, `NotificationDomainModule`)
- Utilities for messaging, requests, responses, helpers, files, pagination, and Firebase

## Configs

**Location:** `src/configs/`

Typed `registerAs` files:
- Database, Redis, Logger, Auth, AWS, Email, Firebase, Feature Flags, User, Session, Request/Response
- Each file (e.g., `database.config.ts`, `auth.config.ts`) holds env vars, settings, and validation for its domain
- `index.ts` exports them for `ConfigModule`

## Languages

**Location:** `src/languages/`

i18n JSON, one folder per locale. It contains:
- Subfolders for each supported language (e.g., `en/` for English)
- JSON files for each domain or feature (e.g., `user.json`, `auth.json`, `policy.json`) containing translation strings and messages

## Migration

**Location:** `src/migration/`

The migration folder seeds initial data. PostgreSQL schema migrations live under `prisma/migrations/*`; `src/migration/` contains the application seed commands. It includes:
- `migration.module.ts`: Registers every seed command as a provider
- Subfolders for migration bases, data, enums, interfaces, and seeds
- Populates the reference and bootstrap rows an empty database needs: api keys, countries, feature flags, roles, policies, term policies, users, and workspaces (the eight commands bundled into `pnpm migration:seed`)
- Ships three on-demand commands that are not part of `pnpm migration:seed`: `aws-s3-config`, `template-email-notification`, and `template-termPolicy`

## Queues

**Location:** `src/queues/`

The queues folder is the BullMQ framework layer. It includes:
- `queue.module.ts`: `QueueModule.forRoot()` holds the two BullMQ root connections (producer and processor). Named queues are registered by the owning feature's `<feature>.domain.module.ts` through a `RegisterQueueOptionsFactory`; per-queue job defaults are read from `queue.config.ts`
- Subfolders for queue bases, constants, decorators, enums, exceptions, interfaces
- Processor classes live in their owning feature module (`<module>/processors/`), wired by that module's `<feature>.processor.module.ts`
- Immediate, delayed, and recurring jobs

## Router

**Location:** `src/router/`

The router folder mounts everything the application exposes. It includes:
- `router.module.ts`: Root router that imports the five access-level modules and registers their path prefixes through `RouterModule.register` from `@nestjs/core`, plus the processor mount
- `http/`: One module per access level, each holding its controllers and the `<feature>.http.module.ts` imports they need. `router.http.public.module.ts` mounts under `/public`, `router.http.system.module.ts` under `/system`, `router.http.admin.module.ts` under `/admin`, `router.http.user.module.ts` under `/user`, and `router.http.shared.module.ts` under `/shared`
- `processor/router.processor.module.ts`: Aggregates every `<feature>.processor.module.ts`, so the BullMQ workers boot with the HTTP application

## Instrument

**Location:** `src/instrument.ts`

The instrument file configures Sentry. It is imported at the start of bootstrap so Sentry is initialized before anything else. Key responsibilities include:
- Initializing Sentry with DSN and configuration based on the environment
- Configuring sampling rates for traces and profiles (higher in development, lower in production)
- Implementing custom filtering logic in `beforeSend` to drop non-fatal `QueueException` events, requests to the excluded noise routes (`LoggerExcludedRoutes`: health, docs, hello, metrics, favicon, root), responses with a status code below 500, and events at `info` or `debug` level
- Forwarding Pino logs to Sentry Logs through `Sentry.pinoIntegration`, limited to `warn`, `error`, and `fatal` in production and all levels elsewhere
- Setting maximum breadcrumbs, value lengths, and stack trace attachment policies
- Does not send PII to Sentry

## Migration Entrypoint

**Location:** `src/migration.ts`

The migration file is the entry point for the migration CLI tool using **nest-commander**. It handles database migrations, initialization, and data seeding operations. Key responsibilities include:
- Creating a NestJS application context specifically for running CLI commands
- Loading the `MigrationModule` which contains all migration-related logic and commands
- Using Pino logger for CLI logging output
- Running migration commands (e.g., database seeding, data population) and gracefully closing the application after completion
- Can be invoked via the `pnpm migration` command followed by the specific migration command

## Modules

**Location:** `src/modules/`

One folder per feature. Each feature follows the repository design pattern.

**Feature modules:**

```
modules
  ├── activity-log
  ├── analytic
  ├── api-key
  ├── auth
  ├── country
  ├── device
  ├── feature-flag
  ├── health
  ├── hello
  ├── notification
  ├── password-history
  ├── policy
  ├── project
  ├── role
  ├── session
  ├── term-policy
  ├── user
  └── workspace
```

`analytic` orchestrates live metrics through owner `*AnalyticDomain` / `*AnalyticRepository` siblings (for example `user.analytic.domain.ts` with `user.analytic.repository.ts`). It has no repository module of its own. See [Analytic](analytic.md).

**Per-layer Nest modules:**

Each layer of a feature gets its own Nest module file at the root of the feature folder, and only the ones with something to provide exist:

```
modules/<feature>
  ├── <feature>.repository.module.ts  # repositories
  ├── <feature>.domain.module.ts      # domains, utils, caches, queue classes and factories
  │                                   #   (the only one another feature consumes)
  ├── <feature>.http.module.ts        # HTTP services, imported by a router http module
  └── <feature>.processor.module.ts   # processors and their processor services
```

`<feature>.domain.module.ts` is present for every feature. A feature without background jobs has no `<feature>.processor.module.ts`; `notification` and `workspace` are the two that do. `auth`, `policy`, `health`, and `hello` carry only the layers they need.

**Folders:**

No module contains every folder below. Each module includes only the folders its feature needs. The folders fall into three tiers:

```
module
  # Core (present in almost every module)
  ├── constants
  ├── controllers
  ├── domains
  ├── dtos
  ├── enums
  ├── exceptions
  ├── interfaces
  ├── repositories
  ├── services
  ├── utils
  # Common (present when the feature needs them)
  ├── caches
  ├── decorators
  ├── docs
  ├── guards
  # Specialized (a few modules only)
  ├── factories
  ├── indicators
  ├── interceptors
  ├── processors
  ├── queues
  └── templates
```

### Constants
Defines static values and configuration constants used throughout the module.

### Controllers
Handle incoming HTTP requests, delegate to HTTP services, and return responses. Controllers define the API endpoints for the module.

### Decorators
Custom decorators to add metadata or modify behavior of classes, methods, or properties within the module.

### Docs
Documentation files or Swagger decorators for API documentation and reference.

### DTOs (Data Transfer Objects)
Classes that define the shape of data sent and received on API endpoints.

### Enums
Type-safe enumerations for status codes, types, or other fixed sets of values relevant to the module's domain.

### Exceptions
Dedicated exception classes, one per error, each extending `AppBaseException`. Named `<module>.<kebab-error>.exception.ts` (e.g., `user.not-found.exception.ts`).

### Factories
Factory classes or functions for creating instances of complex objects or aggregating dependencies.

### Indicators
Health-check indicators that report the status of a dependency or subsystem (used by the health module).

### Guards
Authorization and access control logic, protecting routes and resources based on user roles or permissions.

### Interfaces
TypeScript interfaces for contracts between services, repositories, and other components, promoting loose coupling and testability.

### Interceptors
Logic to intercept and modify requests or responses, such as logging, caching, or response transformation.

### Processors
Background job handlers, such as BullMQ processors, for asynchronous tasks related to the module.

### Queues
The `@Injectable()` classes holding the BullMQ `Queue`, one method per job the feature enqueues. They are provided and exported by `<feature>.domain.module.ts`.

### Repositories
Implements the Repository design pattern for data access, abstracting database operations and providing a clean API for domains.

### Domains
Business logic and orchestration of the module. Domains interact with repositories, other domains, utils, and queue classes. They open `DatabaseService.withTransaction` when a write spans more than one repository.

### Services
HTTP services (`*.http.service.ts`) and processor services (`*.processor.service.ts`). They translate transport or job payloads into domain calls and assemble response DTOs. They own no business rule and reach no repository.

### Caches
Dedicated cache classes that wrap a named cache provider for one feature concern (for example `SessionCache`, `FeatureFlagCache`).

### Templates
Reusable templates, such as email templates or message formats, used by the module.

### Utils
Pure shaping helpers specific to the module: mappers, predicates, and format checks. A util reaches no cache, repository, queue, request store, or file service; work that needs one of those lives in a domain.


## Other Modules

Below are explanations for the root folders and files outside `src/`:

### Folders

- **.github/**: GitHub-specific configuration including Actions workflows, issue and pull request templates, and Dependabot settings.
- **.husky/**: Git hooks for enforcing code quality checks (e.g., commit message linting) before commits.
- **.vscode/**: Shared editor settings, tasks, launch configurations, and recommended extensions.
- **ci/**: Dockerfiles (`dockerfile`, `dockerfile.local`), the JWKS server nginx config, and the Vault bootstrap scripts and policies.
- **docs/**: Project documentation, including architecture, features, and usage guides.
- **generated/**: Auto-generated output: the Prisma client (`prisma-client/`), the Swagger JSON (`swagger.json`), the Vault init material (`vault/`), and agent reports (`docs/`). Not tracked by git.
- **keys/**: Stores public/private keys and JWKS files for authentication and security. Not tracked by git.
- **logs/**: Directory for application logs. Not tracked by git.
- **prisma/**: Contains `schema.prisma`, the single source of truth for the database schema, plus PostgreSQL migration files under `prisma/migrations/*`.
- **scripts/**: Utility scripts for tasks like key generation.
- **test/**: Vitest specs mirroring `src/`; the runner is configured in the root `vitest.config.ts` and runs with `pnpm test`.

### Files

- **.commitlintrc**: Configuration for commit message linting to enforce commit standards.
- **.dockerignore**: Specifies files and directories to exclude from Docker builds.
- **.env.example**: Example environment variable file for reference and onboarding. `.env` itself is not tracked by git.
- **.gitignore**: Specifies files and directories to exclude from Git version control.
- **.npmrc**: Configuration for npm package manager behavior.
- **.prettierignore**: Specifies files and directories to exclude from Prettier formatting.
- **.prettierrc**: Configuration for Prettier code formatter.
- **.swcrc**: Configuration for SWC JavaScript/TypeScript compiler.
- **cspell.json**: Configuration for code spell checking to maintain code quality and consistency.
- **docker-compose.yml**: Docker Compose configuration for orchestrating multi-container Docker applications, such as local development environments.
- **eslint.config.mjs**: ESLint configuration for code linting and style enforcement.
- **nest-cli.json**: Configuration for NestJS CLI, defining project structure and build options.
- **package.json**: Node.js project manifest, listing dependencies, scripts, and metadata.
- **pnpm-lock.yaml**: pnpm lockfile.
- **pnpm-workspace.yaml**: pnpm settings for this single-package repo: `allowBuilds` (the packages permitted to run install scripts, for example `prisma` and `@swc/core`) and `minimumReleaseAgeExclude` (packages exempted from the minimum release-age hold).
- **tsconfig.json**: TypeScript configuration read by `pnpm typecheck` (`tsc --noEmit`), by `ts-prune` through `pnpm deadcode` (`--project tsconfig.json`), and by the editor. Its `include` covers `src/**/*`, `test/**/*`, and `scripts/**/*`, and it carries the path aliases (`@app/*`, `@common/*`, `@configs/*`, `@config`, `@modules/*`, `@router/*`, `@migration/*`, `@test/*`, `@generated/*`, `@prisma/client`, `@queues/*`, `@package`).
- **tsconfig.build.json**: The build-time TypeScript configuration, named by `nest-cli.json` under `compilerOptions.tsConfigPath`, so `nest build` and `nest start` read it. It extends `tsconfig.json`, narrows `include` to `src/**/*`, and excludes `test` and `scripts`.
- **README.md**: Project introduction, feature list, and entry point to the documentation.
- **CONTRIBUTING.md**: Contribution workflow and standards.
- **CODE_OF_CONDUCT.md**: Community code of conduct.
- **SECURITY.md**: Supported versions and vulnerability reporting process.
- **LICENSE.md**: Project license.



