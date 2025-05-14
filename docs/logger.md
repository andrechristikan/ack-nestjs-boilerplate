# Overview

The ACK NestJS Boilerplate implements a comprehensive logging system using Pino, a very low overhead Node.js logger.

This documentation explains the features and usage of:
- **Logger Module**: Located at `src/common/logger`
- **Sentry Integration**: Located at `src/instrument.ts`

The logger is configured globally and is automatically available throughout the application via dependency injection.

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Debug Configuration](#debug-configuration)
  - [Modules](#modules)
    - [Logger Option Module](#logger-option-module)
  - [Sentry](#sentry)
    - [Configuration](#configuration-1)
    - [How It Works](#how-it-works)
    - [Filtering and Sampling](#filtering-and-sampling)
  - [Examples](#examples)
    - [Basic Logging](#basic-logging)
    - [Error Handling](#error-handling)
  - [Sensitive Data Handling](#sensitive-data-handling)
  - [File Logging](#file-logging)
  - [Performance Considerations](#performance-considerations)


## Configuration

### Environment Variables

The logger behavior can be controlled through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG_ENABLE` | Enable/disable debug logging | `false` |
| `DEBUG_LEVEL` | Minimum log level to output | `debug` |
| `DEBUG_INTO_FILE` | Whether to write logs to files | `false` |
| `DEBUG_PRETTIER` | Enable pretty-printing of logs | `true` |
| `SENTRY_DSN` | Sentry Data Source Name for error tracking | undefined |

These can be set in your `.env` file. For example:

```dotenv
DEBUG_ENABLE=true
DEBUG_LEVEL=info
DEBUG_INTO_FILE=true
DEBUG_PRETTIER=true
SENTRY_DSN=https://your-sentry-dsn
```

### Debug Configuration

The logger's behavior is defined in `src/configs/debug.config.ts`:

```typescript
export default registerAs(
    'debug',
    (): Record<string, any> => ({
        enable: process.env.DEBUG_ENABLE === 'true',
        level: process.env.DEBUG_LEVEL,
        intoFile: process.env.DEBUG_INTO_FILE === 'true',
        filePath: '/logs',
        autoLogger: false,
        prettier: process.env.DEBUG_PRETTIER === 'true',
        sentry: {
            dsn: process.env.SENTRY_DSN,
            timeout: ms('10s'),
        },
    })
);
```

The logger also defines excluded routes that won't be logged in `src/common/logger/constants/logger.constant.ts`:

```typescript
export const LOGGER_EXCLUDED_ROUTES: string[] = [
    '/api/health*',
    '/metrics*',
    '/favicon.ico',
    '/docs*',
    '/',
] as const;
```

These excluded routes help reduce noise in the logs and improve performance by avoiding logging of high-frequency endpoints like health checks.

## Modules

### Logger Option Module

The `LoggerOptionModule` (`src/common/logger/logger.option.module.ts`) sets up the Logger configuration. It consists of:

- **LoggerOptionService**: Located at `src/common/logger/services/logger.option.service.ts`, this service is responsible for creating Pino logger configuration based on the application's environment settings.
- **Logger Constants**: Located at `src/common/logger/constants/logger.constant.ts`, these constants define excluded routes and sensitive data fields for redaction.

The logger is integrated globally in the `CommonModule` (`src/common/common.module.ts`) using:

```typescript
PinoLoggerModule.forRootAsync({
    imports: [LoggerOptionModule],
    inject: [LoggerOptionService],
    useFactory: async (loggerOptionService: LoggerOptionService) => {
        return loggerOptionService.createOptions();
    },
}),
```

## Sentry

The boilerplate integrates Sentry for error tracking and monitoring. This provides:

- Automatic error capture
- Performance monitoring
- Error filtering based on status code and route
- Node.js profiling for performance analysis
- Intelligent event sampling based on environment

### Configuration

Sentry is initialized in `src/instrument.ts`:

```typescript
Sentry.init({
    dsn: debugConfigs.sentry.dsn,
    debug: false,
    environment: appConfigs.env,
    release: appConfigs.version,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION ? 0.3 : 1.0,
    profilesSampleRate: appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION ? 0.1 : 0.5,
    normalizeDepth: 3,
    maxValueLength: 1000,
    attachStacktrace: false,
    sendDefaultPii: false,
    maxBreadcrumbs: 30,
    // additional configuration...
});
```

### How It Works

The `AppGeneralFilter` captures exceptions and forwards them to Sentry using the `sendToSentry` method:

```typescript
sendToSentry(exception: unknown): void {
    // Skip certain exception types
    if (
        (exception instanceof HttpException &&
            !(exception instanceof InternalServerErrorException)) ||
        exception instanceof RequestValidationException ||
        exception instanceof FileImportException
    ) {
        return;
    }

    try {
        Sentry.captureException(exception);
    } catch (err: unknown) {
        this.logger.error(err);
    }

    return;
}
```

### Filtering and Sampling

The Sentry integration includes advanced filtering to reduce noise and focus on important events:

1. **Route Filtering**: Health check and documentation routes are excluded from error tracking
2. **Status Code Filtering**: Only 5xx errors are sent to Sentry by default
3. **Log Level Filtering**: Debug and info level events are not sent to Sentry
4. **Exception Type Filtering**: Certain exception types, such as validation errors, are ignored
5. **Worker Exception Filtering**: Non-fatal worker exceptions are excluded

Sampling rates are configured to optimize cost and performance:

```typescript
tracesSampler: samplingContext => {
    const transaction = samplingContext?.transactionContext;

    if (
        appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION &&
        transaction?.data?.status === 'ok'
    ) {
        // Only sample 5% of successful transactions
        return 0.05;
    }

    // Use normal sampling rate for errors or non-production
    return appConfigs.env === ENUM_APP_ENVIRONMENT.PRODUCTION
        ? 0.3
        : 1.0;
},
```

## Examples

### Basic Logging

The NestJS Logger is used throughout the application for consistent logging:

```typescript
import { Logger } from '@nestjs/common';

export class ExampleService {
    private readonly logger = new Logger(ExampleService.name);

    doSomething() {
        this.logger.log('This is a log message');
        this.logger.debug('This is a debug message');
        this.logger.warn('This is a warning message');
        this.logger.error('This is an error message');
    }
}
```

### Error Handling

Proper error logging with stack traces:

```typescript
import { Logger } from '@nestjs/common';

export class ErrorHandlingService {
    private readonly logger = new Logger(ErrorHandlingService.name);

    async riskyOperation() {
        try {
            // Operation that may fail
            await someAsyncOperation();
        } catch (error) {
            this.logger.error(
                `Failed to complete operation: ${error.message}`,
                error.stack
            );
            throw error;
        }
    }
}
```

## Sensitive Data Handling

The logger automatically redacts sensitive information in requests and responses. Sensitive fields are defined in `src/common/logger/constants/logger.constant.ts`:

```typescript
export const LOGGER_SENSITIVE_FIELDS: string[] = [
    'password',
    'newPassword',
    'oldPassword',
    'token',
    'authorization',
    'bearer',
    'cookie',
    'secret',
    'credential',
    'jwt',
    'x-api-key',
    'apiKey',
    'refreshToken',
    'accessToken',
    'sessionId',
    'set-cookie',
    'creditCard',
    'cardNumber',
    'cvv',
    'cvc',
    'ccv',
    'pin',
    'bankAccount',
    // Additional sensitive fields...
];
```

These fields are automatically replaced with `***REDACTED***` in logs using Pino's redaction feature:

```typescript
redact: {
    paths: [
        ...LOGGER_SENSITIVE_FIELDS.map(field =>
            field.includes('-')
                ? `req.body["${field}"]`
                : `req.body.${field}`
        ),
        ...LOGGER_SENSITIVE_FIELDS.map(field =>
            field.includes('-')
                ? `req.headers["${field}"]`
                : `req.headers.${field}`
        ),
        ...LOGGER_SENSITIVE_FIELDS.map(field =>
            field.includes('-')
                ? `res.body["${field}"]`
                : `res.body.${field}`
        ),
        ...LOGGER_SENSITIVE_FIELDS.map(field =>
            field.includes('-')
                ? `res.headers["${field}"]`
                : `res.headers.${field}`
        ),
    ],
    censor: '***REDACTED***',
},
```

## File Logging

When `DEBUG_INTO_FILE` is enabled, logs are written to files in the `/logs` directory. The system uses rotating file streams to manage log files:

- Log files are rotated daily or when they reach 10MB
- Files are compressed using gzip
- Up to 10 rotated files are kept
- Files older than 7 days are automatically removed

Example log file paths:
- `/logs/api.log` - Current log file
- `/logs/api.log.1.gz` - Previous rotated log file

## Performance Considerations

The logging system is designed to have minimal impact on application performance:

1. **Conditional Logging**: Logs below the configured level are not processed
2. **Path Exclusion**: Certain paths (like health checks) are excluded from automatic logging using `LOGGER_EXCLUDED_ROUTES` 
3. **Production Settings**: In production, sampling rates for Sentry are reduced (5% for successful transactions, 30% for others)
4. **Asynchronous Processing**: Logs are processed asynchronously when possible
5. **Buffer Control**: Large log objects are truncated to prevent memory issues (using `maxValueLength: 1000`)
6. **Format Control**: Normalized depth is limited (using `normalizeDepth: 3`) to prevent excessive serialization
7. **Breadcrumb Limitation**: Limited to 30 breadcrumbs to control memory usage

When configuring for production, consider:
- Setting `DEBUG_LEVEL` to `info` or higher
- Disabling `DEBUG_PRETTIER` for better performance
- Enabling `DEBUG_INTO_FILE` for persistence
- Configuring proper log rotation settings
