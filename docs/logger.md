# Overview

The ACK NestJS Boilerplate implements a comprehensive logging system using Pino, a very low overhead Node.js logger.

The logger is configured globally and is automatically available throughout the application via dependency injection.

## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Debug Configuration](#debug-configuration)
  - [Modules](#modules)
    - [Logger Option](#logger-option)
  - [Sentry](#sentry)
    - [Configuration](#configuration-1)
    - [How It Works](#how-it-works)
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

## Modules

### Logger Option

The `LoggerOptionService` (`src/common/logger/services/logger.option.service.ts`) is responsible for creating Pino logger configuration based on the application's environment settings.

## Sentry

The boilerplate integrates Sentry for error tracking and monitoring. This provides:

- Automatic error capture
- Performance monitoring
- Error filtering based on status code and route

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

## Examples

### Basic Logging

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
    // Additional sensitive fields...
];
```

These fields are automatically replaced with `***REDACTED***` in logs.

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
2. **Path Exclusion**: Certain paths (like health checks) are excluded from automatic logging
3. **Production Settings**: In production, sampling rates for Sentry are reduced
4. **Asynchronous Processing**: Logs are processed asynchronously when possible
5. **Buffer Control**: Large log objects are truncated to prevent memory issues

When configuring for production, consider:
- Setting `DEBUG_LEVEL` to `info` or higher
- Disabling `DEBUG_PRETTIER` for better performance
- Enabling `DEBUG_INTO_FILE` for persistence
- Configuring proper log rotation settings
