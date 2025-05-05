# Overview

This project is a comprehensive NestJS boilerplate with a modular architecture designed for building scalable and maintainable applications. Here's a breakdown of the modules and components:

## Structure ([`src`](src ))

### Application Module ([`src/app`](src/app ))
The application core handles HTTP middleware configuration, global exception filters, and application bootstrap processes in a unified foundation layer. It includes:
- **Middlewares** - HTTP request processing (CORS, body parsing, helmet security, request ID)
- **Filters** - Global exception handling for validation, HTTP, and general errors
- **Guards** - Environment-based access control for route protection
- **Error Handling** - Centralized error processing with Sentry integration

### Common Modules ([`src/common`](src/common ))
- **Database** - MongoDB integration via Mongoose
- **Message** - Internationalization (i18n) support
- **Helper** - Utility services (string, date, encryption, etc.)
- **Request** - Request validation and processing
- **Response** - Standardized API responses
- **Pagination** - Data pagination utilities
- **File** - File handling services
- **Cache** - Redis-based caching
- **Logger** - Pino-based logging system
- **Doc** - API documentation with Swagger

### Feature Modules ([`src/modules`](src/modules ))
- `auth/` - Authentication with JWT
- `api-key/` - API key management
- `policy/` - Role-based access control
- `role/` - User role management
- `session/` - User session tracking
- `user/` - User entity and operations
- `password-history/` - Password history tracking
- `reset-password/` - Password reset functionality
- `verification/` - User verification (email, mobile)
- `activity/` - User activity tracking
- `aws/` - AWS integration (S3, SES, Pinpoint)
- `email/` - Email sending services
- `sms/` - SMS messaging services
- `health/` - System health checks
- `setting/` - Application settings
- `country/` - Country reference data

### Routing Organization ([`src/router`](src/router ))
- **Route Modules** - Separated by access level:
  - [`routes.admin.module.ts`](src/router/routes/routes.admin.module.ts ) - Admin endpoints for administrative operations, accessible only to users with admin privileges. Includes user management, settings configuration, and system monitoring features.
  - [`routes.public.module.ts`](src/router/routes/routes.public.module.ts ) - Public endpoints that don't require authentication. Includes login, registration, password reset requests, and general public information.
  - [`routes.system.module.ts`](src/router/routes/routes.system.module.ts ) - System endpoints for application maintenance, monitoring, and frontend data retrieval. Includes health checks, metrics, and data search endpoints that can be accessed by the frontend without authentication requirements. Used for retrieving reference data, dropdown options, and other non-sensitive information needed by frontend applications.
  - [`routes.user.module.ts`](src/router/routes/routes.user.module.ts ) - User endpoints for authenticated regular users. Includes profile management, user-specific operations, and features that require user authentication.
  - [`routes.shared.module.ts`](src/router/routes/routes.shared.module.ts ) - Shared endpoints accessible by multiple user types (admins and regular users) with appropriate authorization checks. Includes common functionalities.

### Background Processing ([`src/worker`](src/worker ))
- **Queue Management** - BullMQ-based job processing
- **Processors Distribution** - Processors are not centralized in this folder but are placed within their respective feature modules
  - For example, the email processor is in `src/modules/email/processors/email.processor.ts`
  - The SMS processor is in `src/modules/sms/processors/sms.processor.ts`
  - The session processor is in `src/modules/session/processors/session.processor.ts`
- **Processor Responsibility** - Each processor handles its specific domain jobs and connects to related services
- **Queue Registration** - Only queue configuration and registration happens in the worker module

### Configuration & Setup ([`src/configs`](src/configs ))
- **Centralized Configuration** - All application configuration is managed in this folder
- **Environment Variables** - Values from .env files are processed and validated here
- **Configuration Access** - Modules access environment variables only through the ConfigService
- **Abstraction Layer** - Direct access to process.env is prohibited; all environment access is through this layer
- **Type Safety** - Environment variables are properly typed and validated before use
- **Default Values** - Fallback values for missing environment variables are defined here


### Internationalization ([`src/language`](src/language ))
- **Translation Files** - JSON-based language dictionaries for multi-language support
- **Message Customization** - Customizable messages for different languages and contexts

### Migration ([`src/migration`](src/migration ))
- **Data Migrations** - For data seeding
