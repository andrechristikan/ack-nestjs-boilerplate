# Project Structure Documentation

## Overview

ACK NestJS Boilerplate is a comprehensive NestJS application designed for scalable, maintainable, and enterprise-grade development. It is built with a strong focus on the `repository design pattern` and a fully `modular architecture`. By leveraging these patterns, the codebase achieves clear separation of concerns, high testability, and easy extensibility for new features. 

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

Each folder serves a specific purpose, supporting modularity and maintainability.

## App Module

**Location:** `src/app/app.module.ts`

The App Module is the root module and entry point for the ACK NestJS Boilerplate application. It orchestrates the core setup by:
- Importing two modules: `CommonModule` (shared infrastructure and global feature modules) and `RouterModule` (HTTP route mounting and the queue processor mount).
- Registering five global exception filters for handling application exceptions, general, HTTP, validation, and import validation errors.
- Following NestJS best practices for modular architecture and separation of concerns.

## Common Module

**Location:** `src/common/common.module.ts`

The Common Module provides shared functionality and global services across the ACK NestJS Boilerplate application. It configures:
- Global configuration management (using `ConfigModule` and custom configs)
- Caching and queueing (Redis, BullMQ)
- Logging (LoggerModule)
- Database access (DatabaseModule)
- Authentication and authorization (AuthModule, PolicyModule, RoleModule, ApiKeyModule, FeatureFlagModule, TermPolicyModule, SessionModule, ActivityLogModule, NotificationModule)
- Utilities for messaging, requests, responses, helpers, files, pagination, and Firebase
- Registers all these modules as global or shared imports for use throughout the application

## Configs

**Location:** `src/configs/`

The configs folder contains strongly-typed configuration files for all major application features and integrations, including:
- Database, Redis, Logger, Auth, AWS, Email, Firebase, Feature Flags, User, Session, Request/Response, and more
- Each config file (e.g., `database.config.ts`, `auth.config.ts`) centralizes environment variables, settings, and validation logic for its domain
- The `index.ts` file aggregates and exports all configs for use in global configuration management

## Languages

**Location:** `src/languages/`

The languages folder provides internationalization (i18n) resources for multi-language support. It contains:
- Subfolders for each supported language (e.g., `en/` for English)
- JSON files for each domain or feature (e.g., `user.json`, `auth.json`, `policy.json`) containing translation strings and messages
- Enables dynamic and scalable localization for all application features

## Migration

**Location:** `src/migration/`

The migration folder seeds initial data. MongoDB has no migration files; the schema shape is applied by `pnpm db:migrate` (`prisma db push`). It includes:
- `migration.module.ts`: Registers every seed command as a provider
- Subfolders for migration bases, data, enums, interfaces, and seeds
- Populates the reference and bootstrap rows an empty database needs: api keys, countries, feature flags, roles, term policies, users, and workspaces (the seven commands bundled into `pnpm migration:seed`)
- Ships three on-demand commands that are not part of `pnpm migration:seed`: `aws-s3-config`, `template-email-notification`, and `template-termPolicy`

## Queues

**Location:** `src/queues/`

The queues folder is the BullMQ framework layer. It includes:
- `queue.register.module.ts`: Global module holding every `BullModule.registerQueueAsync` call, the two BullMQ root connections (queue and processor), and the per-queue job defaults read from `queue.config.ts`
- Subfolders for queue bases, constants, decorators, enums, exceptions, interfaces
- Processor classes live in their owning feature module (`<module>/processors/`), wired by that module's `<feature>.processor.module.ts`; the queue registration lives here
- Supports immediate, delayed, and recurring jobs for tasks like email sending, data processing, etc.

## Router

**Location:** `src/router/`

The router folder mounts everything the application exposes. It includes:
- `router.module.ts`: Root router that imports the five access-level modules and registers their path prefixes through `RouterModule.register` from `@nestjs/core`, plus the processor mount
- `http/`: One module per access level, each holding its controllers and the `<feature>.http.module.ts` imports they need. `router.http.public.module.ts` mounts under `/public`, `router.http.system.module.ts` under `/system`, `router.http.admin.module.ts` under `/admin`, `router.http.user.module.ts` under `/user`, and `router.http.shared.module.ts` under `/shared`
- `processor/router.processor.module.ts`: Aggregates every `<feature>.processor.module.ts`, so the BullMQ workers boot with the HTTP application
- Ensures clear separation of concerns and robust access control for all API endpoints

## Instrument

**Location:** `src/instrument.ts`

The instrument file configures observability and monitoring for the application using **Sentry**. It is imported at the very beginning of the application bootstrap to ensure all errors and transactions are properly tracked. Key responsibilities include:
- Initializing Sentry with DSN and configuration based on the environment
- Configuring sampling rates for traces and profiles (higher in development, lower in production)
- Implementing custom filtering logic in `beforeSend` to drop non-fatal `QueueException` events, requests to the excluded noise routes (`LoggerExcludedRoutes`: health, docs, hello, metrics, favicon, root), responses with a status code below 500, and events at `info` or `debug` level
- Forwarding Pino logs to Sentry Logs through `Sentry.pinoIntegration`, limited to `warn`, `error`, and `fatal` in production and all levels elsewhere
- Setting maximum breadcrumbs, value lengths, and stack trace attachment policies
- Ensuring sensitive data (PII) is not sent to Sentry

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

The modules folder contains all feature modules, each representing a distinct domain or functionality in the application. Every module is self-contained and follows the repository design pattern, ensuring clear separation of concerns and scalability.

**Feature modules:**

```
modules
  ├── activity-log
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

**Per-layer Nest modules:**

Each layer of a feature gets its own Nest module file at the root of the feature folder, and only the ones with something to provide exist:

```
modules/<feature>
  ├── <feature>.util.module.ts        # utils
  ├── <feature>.repository.module.ts  # repositories
  ├── <feature>.module.ts             # domain services (the only one another feature consumes)
  ├── <feature>.http.module.ts        # HTTP services, imported by a router http module
  └── <feature>.processor.module.ts   # processors and their processor services
```

`<feature>.module.ts` is present for every feature. A feature without background jobs has no `<feature>.processor.module.ts`; `notification` and `workspace` are the two that do. `auth`, `policy`, `health`, and `hello` carry only the layers they need.

**Folders:**

No module contains every folder below. Each module includes only the folders its feature needs. The folders fall into three tiers:

```
module
  # Core (present in almost every module)
  ├── constants
  ├── controllers
  ├── dtos
  ├── enums
  ├── exceptions
  ├── interfaces
  ├── repositories
  ├── services
  ├── utils
  # Common (present when the feature needs them)
  ├── decorators
  ├── docs
  ├── guards
  # Specialized (a few modules only)
  ├── factories
  ├── indicators
  ├── interceptors
  ├── processors
  ├── templates
  └── validations
```

This structure ensures each feature is isolated, testable, and easy to maintain.

Below are explanations for each section:

### Constants
Defines static values and configuration constants used throughout the module to ensure consistency and avoid magic numbers or strings.

### Controllers
Handle incoming HTTP requests, delegate to services, and return responses. Controllers define the API endpoints for the module.

### Decorators
Custom decorators to add metadata or modify behavior of classes, methods, or properties within the module.

### Docs
Documentation files or Swagger decorators for API documentation and reference.

### DTOs (Data Transfer Objects)
Classes that define the shape of data sent and received via API endpoints, ensuring validation and type safety.

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

### Repositories
Implements the Repository design pattern for data access, abstracting database operations and providing a clean API for services.

### Services
Business logic and core functionality of the module. Services interact with repositories, perform computations, and orchestrate workflows.

### Templates
Reusable templates, such as email templates or message formats, used by the module.

### Utils
Utility functions and helpers specific to the module, such as formatting, calculations, or domain-specific operations.

### Validations
Validation logic for DTOs and other data structures, often using class-validator or custom validation rules.


## Other Modules

Below are explanations for the root folders and files outside `src/`:

### Folders

- **.github/**: GitHub-specific configuration including Actions workflows, issue and pull request templates, and Dependabot settings.
- **.husky/**: Git hooks for enforcing code quality checks (e.g., commit message linting) before commits.
- **.vscode/**: Shared editor settings, tasks, launch configurations, and recommended extensions.
- **ci/**: Dockerfiles (`dockerfile`, `dockerfile.local`), the JWKS server nginx config, the MongoDB replica-set entrypoint, and the Vault bootstrap scripts and policies.
- **docs/**: Project documentation, including architecture, features, and usage guides.
- **generated/**: Auto-generated output: the Prisma client (`prisma-client/`), the Swagger JSON (`swagger.json`), the Vault init material (`vault/`), and agent reports (`docs/`). Not tracked by git.
- **keys/**: Stores public/private keys and JWKS files for authentication and security. Not tracked by git.
- **logs/**: Directory for application logs. Not tracked by git.
- **prisma/**: Contains `schema.prisma`, the single source of truth for the database schema. MongoDB has no migration files.
- **scripts/**: Utility scripts for tasks like key generation.
- **test/**: Jest configuration (`jest.json`). The spec suite is meant to mirror `src/`, but no spec files are committed, so `pnpm test` passes through `--passWithNoTests`.

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
- **pnpm-lock.yaml**: pnpm lockfile ensuring deterministic dependency installation.
- **pnpm-workspace.yaml**: pnpm settings for this single-package repo: `allowBuilds` (the packages permitted to run install scripts, for example `prisma` and `@swc/core`) and `minimumReleaseAgeExclude` (packages exempted from the minimum release-age hold).
- **tsconfig.json**: TypeScript configuration file, specifying compiler options and the path aliases (`@app/*`, `@common/*`, `@configs/*`, `@config`, `@modules/*`, `@router/*`, `@migration/*`, `@test/*`, `@generated/*`, `@prisma/client`, `@queues/*`, `@package`).
- **README.md**: Project introduction, feature list, and entry point to the documentation.
- **CONTRIBUTING.md**: Contribution workflow and standards.
- **CODE_OF_CONDUCT.md**: Community code of conduct.
- **SECURITY.md**: Supported versions and vulnerability reporting process.
- **LICENSE.md**: Project license.





