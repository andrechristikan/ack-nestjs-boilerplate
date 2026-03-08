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
- [Migration](#migration-file)
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
- Importing essential modules: `CommonModule` (shared utilities), `RouterModule` (API routing), and `QueueModule` (background jobs).
- Registering four global exception filters for handling general, HTTP, validation, and import validation errors.
- Following NestJS best practices for modular architecture and separation of concerns.

## Common Module

**Location:** `src/common/common.module.ts`

The Common Module provides shared functionality and global services across the ACK NestJS Boilerplate application. It configures:
- Global configuration management (using `ConfigModule` and custom configs)
- Caching and queueing (Redis, BullMQ)
- Logging (LoggerModule)
- Database access (DatabaseModule)
- Authentication and authorization (AuthModule, PolicyModule, RoleModule, ApiKeyModule, FeatureFlagModule, TermPolicyModule, SessionModule, ActivityLogModule, NotificationModule)
- Utilities for messaging, requests, helpers, files, pagination, and Firebase
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

The migration folder manages database migrations, initialization, and data seeding. It includes:
- `migration.module.ts`: Main migration module for orchestrating migration logic
- Subfolders for migration bases, data, enums, interfaces, and seeds
- Ensures the database schema is up-to-date and supports initial and ongoing data population

## Queues

**Location:** `src/queues/`

The queues folder implements background job processing using BullMQ and Redis. It includes:
- `queue.module.ts`: Main queue module for job orchestration
- `queue.register.module.ts`: Registers and manages queue processors
- Subfolders for queue bases, constants, decorators, enums, exceptions, interfaces
- Supports immediate, delayed, and recurring jobs for tasks like email sending, data processing, etc.

## Router

**Location:** `src/router/`

The router folder defines API routing by access level. It includes:
- `router.module.ts`: Main router module for API route orchestration
- `routes/`: Subfolder organizing endpoints by access level (admin, public, user, system, shared)
- Ensures clear separation of concerns and robust access control for all API endpoints

## Instrument

**Location:** `src/instrument.ts`

The instrument file configures observability and monitoring for the application using **Sentry**. It is imported at the very beginning of the application bootstrap to ensure all errors and transactions are properly tracked. Key responsibilities include:
- Initializing Sentry with DSN and configuration based on the environment
- Configuring sampling rates for traces and profiles (higher in development, lower in production)
- Implementing custom filtering logic to exclude non-fatal worker exceptions and protected routes from Sentry reporting
- Setting maximum breadcrumbs, value lengths, and stack trace attachment policies
- Ensuring sensitive data (PII) is not sent to Sentry

## Migration

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

```
module
  ├── bases
  ├── constants
  ├── controllers
  ├── decorators
  ├── docs
  ├── dtos
  ├── entities
  ├── enums
  ├── exceptions
  ├── factories
  ├── filters
  ├── guards
  ├── interceptors
  ├── interfaces
  ├── middlewares
  ├── pipes
  ├── processors
  ├── repositories
  ├── services
  ├── templates
  ├── utils
  └── validations
```

This structure ensures each feature is isolated, testable, and easy to maintain.

Below are explanations for each section in a typical module:

### Bases
Base classes or abstract classes that provide shared functionality for other components in the module.

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
Custom error classes for handling domain-specific exceptions and providing meaningful error messages.

### Factories
Factory classes or functions for creating instances of complex objects or aggregating dependencies.

### Filters
Exception and validation filters to handle errors and transform responses for specific scenarios within the module.

### Guards
Authorization and access control logic, protecting routes and resources based on user roles or permissions.

### Interfaces
TypeScript interfaces for contracts between services, repositories, and other components, promoting loose coupling and testability.

### Interceptors
Logic to intercept and modify requests or responses, such as logging, caching, or response transformation.

### Middlewares
Functions that process requests before they reach controllers, such as logging, authentication, or request transformation.

### Pipes
Transform and validate incoming request data before it reaches controllers, ensuring data integrity and type safety.

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

Below are explanations for the root folders and files outside `src/` (excluding those ignored by git):

### Folders

- **.github/**: GitHub-specific configuration including Actions workflows, issue templates, and Copilot instructions.
- **.husky/**: Git hooks for enforcing code quality checks (e.g., commit message linting) before commits.
- **ci/**: Contains CI/CD configuration files.
- **docs/**: Project documentation, including architecture, features, and usage guides.
- **generated/**: Auto-generated files including the Prisma client and Swagger JSON output.
- **keys/**: Stores public/private keys and JWKS files for authentication and security.
- **logs/**: Directory for application logs.
- **prisma/**: Contains Prisma ORM schema and migration files for database management.
- **scripts/**: Utility scripts for tasks like key generation.
- **test/**: Contains test cases for the project.

### Files

- **.commitlintrc**: Configuration for commit message linting to enforce commit standards.
- **.dockerignore**: Specifies files and directories to exclude from Docker builds.
- **.env.example**: Example environment variable file for reference and onboarding.
- **.gitignore**: Specifies files and directories to exclude from Git version control.
- **.npmrc**: Configuration for npm package manager behavior.
- **.prettierignore**: Specifies files and directories to exclude from Prettier formatting.
- **.prettierrc**: Configuration for Prettier code formatter.
- **.swcrc**: Configuration for SWC JavaScript/TypeScript compiler.
- **cspell.json**: Configuration for code spell checking to maintain code quality and consistency.
- **docker-compose.yml**: Docker Compose configuration for orchestrating multi-container Docker applications, such as local development environments.
- **dockerfile**: Docker build instructions for containerizing the application.
- **eslint.config.mjs**: ESLint configuration for code linting and style enforcement.
- **nest-cli.json**: Configuration for NestJS CLI, defining project structure and build options.
- **package.json**: Node.js project manifest, listing dependencies, scripts, and metadata.
- **pnpm-lock.yaml**: pnpm lockfile ensuring deterministic dependency installation.
- **pnpm-workspace.yaml**: pnpm workspace configuration for monorepo support.
- **tsconfig.json**: TypeScript configuration file, specifying compiler options and project structure.





