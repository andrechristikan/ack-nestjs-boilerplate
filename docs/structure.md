# Overview

This project is a comprehensive NestJS boilerplate with a modular architecture designed for building scalable and maintainable applications. It follows industry best practices, including the Repository pattern, SOLID principles, and provides a robust foundation for building enterprise-grade applications.

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Directory Structure](#directory-structure)
  - [Components](#components)
    - [Application (`src/app`)](#application-srcapp)
    - [Common (`src/common`)](#common-srccommon)
    - [Modules (`src/modules`)](#modules-srcmodules)
    - [API Routing (`src/router`)](#api-routing-srcrouter)
    - [Background Processing (`src/worker`)](#background-processing-srcworker)
    - [Configuration (`src/configs`)](#configuration-srcconfigs)
    - [Internationalization (`src/languages`)](#internationalization-srclanguages)
    - [Migration (`src/migration`)](#migration-srcmigration)

## Directory Structure

```
src/
├── app/                    # Core application infrastructure
├── common/                 # Shared utilities
├── configs/                # Configuration management
├── languages/              # I18n resources
├── migration/              # Database migrations
├── modules/                # Feature modules
├── router/                 # API routing
├── templates/              # Email templates
├── worker/                 # Background jobs
├── cli.ts                  # CLI entry point
├── main.ts                 # App entry point
└── swagger.ts              # API documentation
```

## Components

### Application (`src/app`)

- **Middlewares**: CORS, body parsing, Helmet, request ID, rate limiting
- **Filters**: Exception handling, validation, HTTP errors
- **Guards**: Environment-based access controller

### Common (`src/common`)

- **Database**: MongoDB/Mongoose with Repository pattern
- **Message**: I18n support
- **Helper**: Core utilities (string, date, encryption)
- **Request**: Request processing
- **Response**: API response formatting
- **Pagination**: Limit-offset pagination, sorting, filtering
- **File**: Upload processing, validation, storage
- **Logger**: Structured JSON logging with Pino
- **Doc**: Swagger/OpenAPI documentation

### Modules (`src/modules`)

- **activity** - User activity logging and tracking
- **api-key** - API key management for system access
- **auth** - Authentication with JWT, Google SSO, and Apple SSO
- **aws** - AWS integration (S3, SES)
- **country** - Country reference data
- **email** - Email composition and delivery
- **export** - Data export services
- **health** - System health checks and monitoring
- **hello** - Example module
- **password-history** - Password history tracking for security
- **policy** - Role-based access control and permissions
- **reset-password** - Password reset workflow
- **role** - User role definition and management
- **session** - User session tracking and management
- **setting** - Application settings and configuration
- **sms** - SMS messaging services
- **user** - User entity and operations (CRUD)
- **verification** - User verification (email, mobile)

**Module Structure**
```
modules/[feature]/
├── controllers/           # Request handlers
├── decorators/            # Custom decorators
├── docs/                  # API docs
├── dtos/                  # Data transfer objects
├── entities/              # Database models
├── enums/                 # Type enums
├── guards/                # Feature guards
├── interfaces/            # TS interfaces
├── processors/            # Background jobs
├── repositories/          # Data access
└── services/              # Business logic
```

### API Routing (`src/router`)

- **Routes by Access Level**:
  - `routes.admin.module.ts` - Admin operations
  - `routes.public.module.ts` - Unauthenticated access
  - `routes.system.module.ts` - System operations
  - `routes.user.module.ts` - Authenticated user access
  - `routes.shared.module.ts` - Multi-role endpoints

### Background Processing (`src/worker`)

- BullMQ with Redis for job processing
- Processors in feature modules for better domain cohesion
- Supports immediate, delayed, and recurring jobs

### Configuration (`src/configs`)

- Typed configuration with validation
- Environment variable abstraction

### Internationalization (`src/languages`)
The languages module provides multi-language support.

### Migration (`src/migration`)
The migration module provides tools for database initialization and data seeding.
