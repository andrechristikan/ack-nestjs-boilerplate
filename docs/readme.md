# Overview

This project is a comprehensive NestJS boilerplate with a modular architecture designed for building scalable and maintainable applications. Here's a breakdown of the modules and components:

## Structure ([`src`](src ))

### Application Module ([`src/app`](src/app ))
The application core handles HTTP middleware configuration, global exception filters, and application bootstrap processes in a unified foundation layer. It includes:
- **Middlewares** - HTTP request processing (CORS, body parsing, helmet security, request ID)
- **Filters** - Global exception handling for validation, HTTP, and general errors
- **Guards** - Request throttling to prevent abuse
- **Bootstrapping** - Application initialization and configuration
- **Error Handling** - Centralized error processing with Sentry integration
- **Request Processing** - Custom language detection, response time tracking

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
  - [`routes.admin.module.ts`](src/router/routes/routes.admin.module.ts ) - Admin endpoints
  - [`routes.public.module.ts`](src/router/routes/routes.public.module.ts ) - Public endpoints
  - [`routes.system.module.ts`](src/router/routes/routes.system.module.ts ) - System endpoints
  - [`routes.user.module.ts`](src/router/routes/routes.user.module.ts ) - User endpoints
  - [`routes.shared.module.ts`](src/router/routes/routes.shared.module.ts ) - Shared endpoints

### Background Processing ([`src/worker`](src/worker ))
- **Queue Management** - BullMQ-based job processing
- **Processors** - Email, SMS, and session cleanup workers

### Configuration & Setup ([`src/configs`](src/configs ))
- **Environment-based Configuration** - Database, AWS, auth settings
- **App Settings** - Application-level configuration
