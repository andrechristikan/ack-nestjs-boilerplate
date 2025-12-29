# Logger Documentation

This documentation explains the features and usage of **Logger Module**: Located at `src/common/logger`

## Overview

Comprehensive logging system using Pino with file rotation, sensitive data redaction, Sentry integration, and custom serializers for request/response logging. The system includes HTTP request/response logging, automatic sensitive data redaction, file rotation, configurable log levels, pretty printing for development, route exclusion for health checks, request ID tracking across services, Sentry error tracking, and memory usage and uptime debugging for non-production environments.

## Related Documents

- [Configuration Documentation][ref-doc-configuration] - For logger configuration settings
- [Environment Documentation][ref-doc-environment] - For logger environment variables
- [Handling Error Documentation][ref-doc-handling-error] - For error logging integration
- [Security and Middleware Documentation][ref-doc-security-and-middleware] - For logger middleware and security features
- [Security and Middleware Documentation][ref-doc-security-and-middleware] - For request ID tracking across services 

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Configuration Interface](#configuration-interface)
- [Usage](#usage)
  - [Log Levels](#log-levels)
  - [Log Severity](#log-severity)
- [Sensitive Data Redaction](#sensitive-data-redaction)
  - [Sensitive Paths](#sensitive-paths)
  - [Sensitive Fields](#sensitive-fields)
  - [Redaction Examples](#redaction-examples)
    - [Authentication Data](#authentication-data)
    - [Array Truncation](#array-truncation)
    - [Buffer Handling](#buffer-handling)
    - [Object Depth Limitation](#object-depth-limitation)
- [File Logging](#file-logging)
  - [Configuration](#configuration-1)
  - [File Rotation Settings](#file-rotation-settings)
  - [File Structure](#file-structure)
  - [Log Format](#log-format)
  - [Example Usage](#example-usage)
- [Auto Logging](#auto-logging)
  - [Configuration](#configuration-2)
  - [Logged Information](#logged-information)
  - [Excluded Routes](#excluded-routes)
  - [Pattern Matching Rules](#pattern-matching-rules)
  - [Adding Custom Excluded Routes](#adding-custom-excluded-routes)
  - [Auto-logging Context](#auto-logging-context)
- [Console Output](#console-output)
  - [Pretty Mode (LOGGER_PRETTIER=true)](#pretty-mode-logger_prettiertrue)
  - [JSON Mode (LOGGER_PRETTIER=false)](#json-mode-logger_prettierfalse)
  - [Debug Information (Non-Production)](#debug-information-non-production)
- [Request ID Tracking](#request-id-tracking)
  - [Header Priority](#header-priority)
  - [Fallback Behavior](#fallback-behavior)
  - [Usage Example](#usage-example)
  - [Cross-Service Tracking](#cross-service-tracking)
- [Sentry Integration](#sentry-integration)
  - [Sentry Configuration](#sentry-configuration)
  - [Configuration Details](#configuration-details)
  - [Error Tracking](#error-tracking)
  - [Usage Example](#usage-example-1)
  - [Sentry Context](#sentry-context)
  - [Disabling Sentry](#disabling-sentry)

## Configuration

### Environment Variables

Configuration is managed through environment variables. Add these to your `.env` file:

```env
# Logger Configuration
LOGGER_ENABLE=true
LOGGER_LEVEL=debug
LOGGER_INTO_FILE=false
LOGGER_PRETTIER=true
LOGGER_AUTO=false

# Sentry Configuration (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

| Variable | Description | Type | Default | Required |
|----------|-------------|------|---------|----------|
| `LOGGER_ENABLE` | Enable/disable logging | `boolean` | `false` | No |
| `LOGGER_LEVEL` | Minimum log level | `string` | `debug` | No |
| `LOGGER_INTO_FILE` | Write logs to files | `boolean` | `false` | No |
| `LOGGER_PRETTIER` | Enable pretty-printing in console | `boolean` | `false` | No |
| `LOGGER_AUTO` | Enable automatic HTTP request/response logging | `boolean` | `false` | No |
| `SENTRY_DSN` | Sentry Data Source Name for error tracking | `string` | `undefined` | No |

### Configuration Interface

| Option | Description | Default |
|--------|-------------|---------|
| `enable` | Enable/disable logging | `false` |
| `level` | Minimum log level (`error`, `warn`, `info`, `verbose`, `debug`, `silly`) | `debug` |
| `intoFile` | Write logs to files | `false` |
| `filePath` | Directory path for log files | `/logs` |
| `auto` | Enable automatic HTTP request/response logging | `false` |
| `prettier` | Enable pretty-printing in console | `false` |
| `sentry.dsn` | Sentry DSN for error tracking | `undefined` |
| `sentry.timeout` | Sentry request timeout | `10000ms` (10s) |

## Usage

Use [NestJS][ref-nestjs] Logger throughout the application:

```typescript
import { Logger } from '@nestjs/common';

export class UserService {
    private readonly logger = new Logger(UserService.name);

    async createUser(data: CreateUserDto) {
        this.logger.log('Creating new user');
        
        try {
            const user = await this.userRepository.create(data);
            this.logger.log(`User created: ${user.id}`);
            return user;
        } catch (error) {
            this.logger.error(`Failed to create user: ${error.message}`, error.stack);
            throw error;
        }
    }

    async deleteUser(id: string) {
        this.logger.warn(`Attempting to delete user: ${id}`);
        // deletion logic
    }

    async getUserDetails(id: string) {
        this.logger.debug(`Fetching user details for: ${id}`);
        // fetch logic
    }
}
```

### Log Levels

Available log levels as defined in `EnumLoggerLevel`:

```typescript
this.logger.error('Error message');      // error level - Critical errors
this.logger.warn('Warning message');     // warn level - Warning conditions
this.logger.log('Info message');         // info level - General information
this.logger.verbose('Verbose message');  // verbose level - Detailed information
this.logger.debug('Debug message');      // debug level - Debug information
```

**Level Hierarchy (from highest to lowest priority):**
1. `error` - Critical errors that need immediate attention
2. `warn` - Warning conditions that should be reviewed
3. `info` - General informational messages
4. `verbose` - Detailed informational messages
5. `debug` - Debug-level messages for development

**Note:** Setting `LOGGER_LEVEL=warn` will log only `error` and `warn` messages, filtering out `info`, `verbose`, and `debug`.

### Log Severity

The logger maps numeric Pino levels to severity strings as defined in `EnumLoggerSeverity`:

| Pino Level | Severity | Use Case |
|------------|----------|----------|
| ≥ 60 | `CRITICAL` | System-wide critical failures |
| ≥ 50 | `ERROR` | Application errors |
| ≥ 40 | `WARNING` | Warning conditions |
| ≥ 30 | `INFO` | General information |
| ≥ 20 | `DEBUG` | Debug information |
| < 20 | `TRACE` | Trace-level debugging |

## Sensitive Data Redaction

The logger automatically redacts sensitive fields to prevent exposure of credentials, tokens, and personal information in logs.

### Sensitive Paths

Paths where sensitive data may be located (defined in `logger.constant.ts`):

```typescript
export const LoggerSensitivePaths = [
    'req.body',
    'req.headers',
    'res.body',
    'res.headers',
    'request.body',
    'request.headers',
    'response.body',
    'response.headers',
];
```

The logger will scan these paths in request/response objects and redact any fields matching the sensitive field list.

### Sensitive Fields

Fields that are automatically redacted (defined in `logger.constant.ts`):

```typescript
export const LoggerSensitiveFields: string[] = [
    // Authentication & Authorization
    'password',
    'newPassword',
    'oldPassword',
    'token',
    'authorization',
    'bearer',
    'secret',
    'credential',
    'jwt',
    'x-api-key',
    'apiKey',
    'refreshToken',
    'accessToken',
    'sessionId',
    'privateKey',
    'secretKey',
    'otp',
    'recoveryCode',
    
    // Location & Personal Data
    'location',
    'gps',
    'coordinates',
    'latitude',
    'longitude',
    
    // Session & Cookies
    'cookie',
    'cookies',
];
```

**Redaction Rules:**
- Field names are **case-insensitive** (e.g., `Password`, `PASSWORD`, `password` all match)
- Fields with hyphens are wrapped in brackets (e.g., `req.headers["x-api-key"]`)
- All matching fields are replaced with `[REDACTED]`

### Redaction Examples

#### Authentication Data

**Request with sensitive data:**

```json
{
  "username": "john.doe",
  "password": "secret123",
  "apiKey": "abc-def-ghi-jkl",
  "email": "john@example.com"
}
```

**Logged as:**

```json
{
  "username": "john.doe",
  "password": "[REDACTED]",
  "apiKey": "[REDACTED]",
  "email": "john@example.com"
}
```

#### Array Truncation

Arrays longer than 10 items are automatically truncated to prevent excessive logging:

```json
{
  "items": [
    "item1",
    "item2",
    "item3",
    "item4",
    "item5",
    "item6",
    "item7",
    "item8",
    "item9",
    "item10",
    { "truncated": "...[TRUNCATED] - total length 50" }
  ]
}
```

#### Buffer Handling

Binary data (Buffers) are replaced with a placeholder:

```json
{
  "file": { "buffer": "[BUFFER]" }
}
```

#### Object Depth Limitation

Objects are sanitized up to a maximum depth of **5 levels** to prevent:
- Performance issues with deeply nested objects
- Circular reference problems
- Excessive log size

## File Logging

Enable file logging by setting `LOGGER_INTO_FILE=true`. Logs are written to `./logs/api.log` with automatic rotation using `pino-roll`.

### Configuration

```env
LOGGER_INTO_FILE=true
```

### File Rotation Settings

- **File path**: `./logs/api.log`
- **Size limit**: 10MB per file
- **Rotation**: Daily or when size limit is reached
- **Directory**: Automatically created if it doesn't exist

### File Structure

```
logs/
└── api.log              # Current log file (rotates daily or at 10MB)
```

### Log Format

When `LOGGER_PRETTIER=false`, logs are written in JSON format:

```json
{"severity":"INFO","context":"UserService","timestamp":1764577182750,"msg":"User created: user-123","service":{"name":"ACKNestJs","environment":"production","version":"8.0.0"},"level":30}
```

### Example Usage

```typescript
// Enable file logging in production
// .env.production
LOGGER_ENABLE=true
LOGGER_LEVEL=info
LOGGER_INTO_FILE=true
LOGGER_PRETTIER=false
LOGGER_AUTO=true
```

## Auto Logging

Enable automatic HTTP request/response logging with `LOGGER_AUTO=true`. This feature automatically logs all incoming HTTP requests and their responses without manual instrumentation.

### Configuration

```env
LOGGER_AUTO=true
```

### Logged Information

When auto-logging is enabled, the following information is automatically captured:

**Request:**
- Request ID
- HTTP method
- URL and path
- Route pattern
- User-Agent
- Content-Type
- Client IP address
- Authenticated user ID
- Query parameters (sanitized)
- Request headers (sanitized)

**Response:**
- HTTP status code
- Response time
- Content-Length
- Response headers (sanitized)

### Excluded Routes

Routes excluded from auto-logging (defined in `logger.constant.ts`):

```typescript
export const LoggerExcludedRoutes: string[] = [
    '/api/health',
    '/api/health/*',
    '/metrics',
    '/metrics/*',
    '/favicon.ico',
    '/docs',
    '/docs/*',
    '/',
];
```

### Pattern Matching Rules

- **Exact match**: `/api/health` - matches only this exact path
- **Wildcard suffix**: `/api/health/*` - matches `/api/health/status`, `/api/health/check`, etc.
- **Root path**: `/` - matches only the root endpoint
- All patterns are **case-insensitive**

### Adding Custom Excluded Routes

To exclude additional routes, modify the constant in `src/common/logger/constants/logger.constant.ts`:

```typescript
export const LoggerExcludedRoutes: string[] = [
    '/api/health',
    '/api/health/*',
    '/metrics',
    '/metrics/*',
    '/favicon.ico',
    '/docs',
    '/docs/*',
    '/',
    // Add your custom routes
    '/internal/*',
    '/admin/debug',
];
```

### Auto-logging Context

All auto-logged entries use the context `LoggerAutoContext` to distinguish them from manual logs:

```json
{
  "severity": "INFO",
  "context": "LoggerAutoContext",
  "msg": "request completed",
  "req": { ... },
  "res": { ... }
}
```

## Console Output

The logger supports two output modes: Pretty mode for development and JSON mode for production.

### Pretty Mode (`LOGGER_PRETTIER=true`)

Development-friendly colored output with structured formatting using `pino-pretty`:

```
INFO [2025-12-29 15:18:54.496 +0700]: [UserService] Creating new user
    service: {
      "name": "ACKNestJs",
      "environment": "local",
      "version": "8.0.0"
    }
    additionalData: {
      "userId": "user-123",
      "action": "create"
    }
    debug: {
      "memory": {
        "rss": 449,
        "heapUsed": 182
      },
      "uptime": 2,
      "pid": 12345,
      "hostname": "localhost"
    }
```

**Features:**
- Color-coded log levels (ERROR = red, WARN = yellow, INFO = green, DEBUG = blue)
- Timestamp in system timezone
- Context displayed in square brackets
- Multi-line structured data for readability

**Configuration:**

```env
LOGGER_PRETTIER=true
LOGGER_LEVEL=debug
```

### JSON Mode (`LOGGER_PRETTIER=false`)

Production-optimized structured JSON for log aggregation and analysis tools:

```json
{"severity":"INFO","context":"UserService","timestamp":1735461534496,"msg":"Creating new user","service":{"name":"ACKNestJs","environment":"production","version":"8.0.0"},"additionalData":{"userId":"user-123","action":"create"},"level":30}
```

**Features:**
- Machine-readable single-line JSON format
- Consistent structure for parsing
- Compatible with log aggregation tools (ELK, Datadog, CloudWatch)
- Compact output without formatting

**Configuration:**

```env
LOGGER_PRETTIER=false
LOGGER_LEVEL=info
```

### Debug Information (Non-Production)

In non-production environments (`app.env !== 'production'`), additional debug information is automatically included in every log entry:

```json
{
  "debug": {
    "memory": {
      "rss": 413,
      "heapUsed": 181
    },
    "uptime": 1,
    "pid": 12345,
    "hostname": "dev-server"
  }
}
```

**Debug Fields:**

| Field | Description | Unit |
|-------|-------------|------|
| `memory.rss` | Resident Set Size - total memory allocated | MB |
| `memory.heapUsed` | Heap memory currently in use | MB |
| `uptime` | Process uptime since startup | seconds |
| `pid` | Process ID | number |
| `hostname` | Server hostname | string |

**Use Cases:**
- Memory leak detection
- Performance monitoring
- Process identification in multi-instance deployments

**Note:** Debug information is automatically excluded in production to reduce log size and improve performance.

## Request ID Tracking

The logger extracts and tracks request IDs across services for distributed tracing and correlation.

### Header Priority

Request IDs are extracted from these headers in order of priority:

```typescript
export const LoggerRequestIdHeaders = [
    'x-correlation-id',  // First priority
    'x-request-id',      // Second priority
];
```

### Fallback Behavior

If no request ID header is found, the logger falls back to:
1. The auto-generated `request.id` from the framework
2. A new UUID generated by the framework

### Usage Example

**Client sends request with correlation ID:**

```bash
curl -H "x-correlation-id: req-abc-123" https://api.example.com/users
```

**Logger output:**

```json
{
  "req": {
    "id": "req-abc-123",
    "method": "GET",
    "url": "/users"
  }
}
```

### Cross-Service Tracking

When making requests to other services, propagate the request ID:

```typescript
async callExternalService(requestId: string) {
    const response = await this.httpService.get('https://external-api.com/data', {
        headers: {
            'x-correlation-id': requestId,
        },
    });
    
    return response.data;
}
```

## Sentry Integration

The logger includes built-in Sentry integration for error tracking and monitoring in production environments.

### Sentry Configuration

Configure Sentry by setting the `SENTRY_DSN` environment variable:

```env
# .env.production
SENTRY_DSN=https://your-public-key@o123456.ingest.sentry.io/7654321
```

### Configuration Details

The Sentry configuration is defined in `src/configs/logger.config.ts`:

```typescript
sentry: {
    dsn?: string;        // Sentry Data Source Name
    timeout: number;     // Request timeout in milliseconds (default: 10000ms = 10s)
}
```

**Default timeout:** 10 seconds (`10000ms`)

### Error Tracking

When Sentry DSN is configured, errors logged through the logger are automatically sent to Sentry for:

- **Error aggregation** and grouping
- **Stack trace analysis**
- **Release tracking**
- **Environment tagging**
- **User context** (if available)
- **Request context** (URL, method, headers)

### Usage Example

```typescript
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    async processPayment(orderId: string) {
        try {
            // Process payment logic
        } catch (error) {
            // This error will be sent to Sentry automatically
            this.logger.error(
                `Payment processing failed for order: ${orderId}`,
                error.stack
            );
            throw error;
        }
    }
}
```

### Sentry Context

The logger automatically includes the following context in Sentry reports:

```json
{
  "service": {
    "name": "ACKNestJs",
    "environment": "production",
    "version": "8.0.0"
  },
  "request": {
    "id": "req-123-abc",
    "method": "POST",
    "url": "/api/payments",
    "ip": "203.0.113.45",
    "user": "user-789"
  }
}
```

### Disabling Sentry

To disable Sentry integration, simply remove or comment out the `SENTRY_DSN` environment variable:

```env
# SENTRY_DSN=https://...
```

When DSN is not configured, errors are only logged locally without being sent to Sentry.

<!-- REFERENCES -->

[ref-nestjs]: http://nestjs.com
[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-security-and-middleware]: security-and-middleware.md