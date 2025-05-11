# Structure

This project is a comprehensive NestJS boilerplate with a modular architecture designed for building scalable and maintainable applications. It follows industry best practices, including the Repository pattern, SOLID principles, and provides a robust foundation for building enterprise-grade applications.

## Directory Structure

The codebase is organized into logically separated modules, following a domain-driven and clean architecture approach:

```
src/
├── app/                    # Application module
├── common/                 # Shared utilities and cross-cutting concerns
├── configs/                # Configuration management
├── languages/              # Internationalization (i18n) resources
├── migration/              # Database migrations and seeders
├── modules/                # Feature modules (domain-specific functionality)
├── router/                 # API route organization and versioning
├── templates/              # Email and notification templates
├── worker/                 # Background job processing setup
├── cli.ts                  # Command line interface entry point
├── main.ts                 # Application entry point
└── swagger.ts             # API documentation configuration
```

## Modules

### Application ([`src/app`](src/app))

The application core provides the foundational infrastructure for HTTP request handling and application bootstrap:

- **Middlewares** - HTTP request processing pipeline including:
  - CORS configuration for cross-origin requests
  - Body parsing for JSON and URL-encoded data
  - Helmet security headers to protect against common vulnerabilities
  - Request ID generation for traceability
  - Rate limiting to prevent abuse
  
- **Filters** - Global exception handling:
  - Validation exceptions (invalid request data)
  - HTTP exceptions (404, 403, etc.)
  - General error handling with proper response formatting
  - Error logging with contextual information
  
- **Guards** - Request authorization and protection:
  - Environment-based access control
  - API versioning enforcement
  - Debug mode restrictions
  
- **Error Handling** - Centralized error processing:
  - Sentry integration for production error monitoring
  - Structured error responses
  - Error logging with request context

### Common Modules ([`src/common`](src/common))

These modules provide shared functionality used across the application:

- **Database** - MongoDB integration via Mongoose with:
  - Repository pattern implementation
  - Transaction support
  - Query builders and helpers
  - Database connection management
  - Schema creation utilities
  
- **Message** - Internationalization (i18n) support:
  - Multi-language message resolution
  - Language detection from HTTP headers
  - Dynamic message templating
  
- **Helper** - Core utility services:
  - String manipulation (formatting, validation)
  - Date handling (formatting, timezone conversion)
  - Encryption and hashing
  - Array and object utilities
  - File type validation
  
- **Request** - Request processing utilities:
  - Request validation with DTOs
  - Request transformation
  - Parameter extraction
  
- **Response** - Standardized API response formatting:
  - Success response serialization
  - Error response formatting
  - Pagination response structure
  
- **Pagination** - Data pagination utilities:
  - Page-based pagination
  - Limit-offset pagination
  - Sort and filter capabilities
  - Database query integration
  
- **File** - File handling services:
  - File upload processing
  - File type validation
  - File storage abstraction
  
- **Logger** - Pino-based logging system:
  - Structured JSON logging
  - Log level configuration
  - Context-based logging
  - File and console output
  
- **Doc** - API documentation with Swagger:
  - OpenAPI schema generation
  - API endpoint documentation
  - Request/response example generation

### Feature Modules ([`src/modules`](src/modules))

Feature modules implement specific business domains and functionality. Each module is self-contained with its own controllers, services, DTOs, entities, and repositories:

- **Authentication & Authorization**
  - `auth/` - Authentication with JWT, Google SSO, and Apple SSO
  - `api-key/` - API key management for system access
  - `policy/` - Role-based access control and permissions
  - `role/` - User role definition and management
  - `session/` - User session tracking and management
  
- **User Management**
  - `user/` - User entity and operations (CRUD)
  - `password-history/` - Password history tracking for security
  - `reset-password/` - Password reset workflow
  - `verification/` - User verification (email, mobile)
  - `activity/` - User activity logging and tracking
  
- **External Services Integration**
  - `aws/` - AWS integration (S3, SES, Pinpoint)
  - `email/` - Email composition and delivery
  - `sms/` - SMS messaging services
  
- **System & Maintenance**
  - `health/` - System health checks and monitoring
  - `setting/` - Application settings and configuration
  - `country/` - Country reference data
  - `export/` - Data export services (CSV, Excel)

Each feature module follows a consistent structure:

```
modules/[feature-name]/
├── controllers/           # HTTP request handlers
├── decorators/            # Feature-specific decorators
├── docs/                  # API documentation
├── dtos/                  # Data Transfer Objects
├── entities/              # Database models/schemas
├── enums/                 # Type enumerations
├── guards/                # Feature-specific guards
├── interfaces/            # TypeScript interfaces
├── processors/            # Background job processors
├── repositories/          # Data access layer
├── serializations/        # Response serialization
└── services/              # Business logic
```

### API Routing Organization ([`src/router`](src/router))

The router module provides a clear separation of API endpoints based on access levels and audience:

- **Route Modules** - Endpoints are organized by access level:
  - [`routes.admin.module.ts`](src/router/routes/routes.admin.module.ts) - Admin endpoints for administrative operations, accessible only to users with admin privileges. These endpoints handle user management, settings configuration, and system monitoring.
  
  - [`routes.public.module.ts`](src/router/routes/routes.public.module.ts) - Public endpoints that don't require authentication. Includes user registration, login, password reset requests, and general public information endpoints.
  
  - [`routes.system.module.ts`](src/router/routes/routes.system.module.ts) - System endpoints for application maintenance, monitoring, and frontend data retrieval. Includes health checks, metrics, and data lookup endpoints that can be accessed without authentication requirements, primarily used by frontend applications for reference data.
  
  - [`routes.user.module.ts`](src/router/routes/routes.user.module.ts) - User endpoints for authenticated regular users. These handle profile management, user-specific operations, and other features that require standard user authentication.
  
  - [`routes.shared.module.ts`](src/router/routes/routes.shared.module.ts) - Shared endpoints accessible by multiple user types (both admins and regular users) with appropriate authorization checks. Includes common functionalities used across different user roles.

**Key Benefits:**
- Clear separation of concerns
- Simplified permission management
- Improved API discoverability
- Focused API documentation
- Better testability

### Background Processing ([`src/worker`](src/worker))

The worker module manages background job processing using BullMQ with Redis:

- **Queue Configuration** - Defines job queues and their settings:
  - Retry strategies
  - Concurrency limits
  - Priority settings
  - Job timeout configuration
  
- **Processor Distribution Strategy**:
  - Processors are located within their respective feature modules for better domain cohesion
  - Each processor is responsible for handling jobs related to its specific domain
  - Example locations:
    - Email processor: `src/modules/email/processors/email.processor.ts`
    - SMS processor: `src/modules/sms/processors/sms.processor.ts`
    - Session processor: `src/modules/session/processors/session.processor.ts`
  
- **Queue Registration** - Central registration and configuration:
  - Only queue definitions and registrations occur in the worker module
  - Job producers can be injected into any service
  
- **Job Scheduling** - Support for various job scheduling scenarios:
  - Immediate execution
  - Delayed execution
  - Recurring jobs (cron-based)
  - Job priorities

### Configuration Management ([`src/configs`](src/configs))

The configs module provides centralized configuration with strong typing and validation:

- **Environment Abstraction** - Typed configuration access:
  - Environment variables are validated and transformed
  - Type safety throughout the application
  - Default values for development environments
  
- **Configuration Sections** - Logically grouped configurations:
  - App configuration (name, version, environment)
  - Database connection settings
  - Authentication settings (JWT, cookies)
  - External service credentials
  - File storage settings
  
- **Configuration Access** - ConfigService pattern:
  - Modules access environment variables through ConfigService
  - Direct access to process.env is prohibited
  - Configuration values are cached for performance
  
- **Security** - Sensitive information handling:
  - Encryption key management
  - Credential validation
  - Secret rotation support

### Internationalization ([`src/languages`](src/languages))

The languages module provides multi-language support:

- **Translation Files** - JSON-based language dictionaries:
  - Per-language message files
  - Nested key structure for organization
  - Support for pluralization and variables
  
- **Message Resolution** - Dynamic message lookup:
  - Language detection from HTTP headers
  - Default language fallback
  - Missing translation handling
  
- **Message Customization** - Flexible templating:
  - Variable substitution in messages
  - Conditional message formatting
  - Contextual translations

### Data Migration ([`src/migration`](src/migration))

The migration module provides tools for database initialization and data seeding:

- **Command-based Execution** - NestJS Command integration:
  - Seeders for initial data
  - Environment-specific migrations
  - Idempotent execution
  
- **Seed Data** - Initial application data:
  - Default roles and permissions
  - Admin user accounts
  - System settings
  - Reference data (countries, timezones)
  
- **Migration Tracking** - Version control for migrations:
  - Sequential execution
  - Migration status tracking
  - Rollback capability
