# Handling Error Documentation

This documentation explains the features and usage of **Exception Filter Module**: Located at `src/app/filters`

## Overview

The error handling system provides comprehensive exception management using NestJS's exception filter mechanism. All errors are transformed into standardized HTTP responses with proper formatting, internationalization, and monitoring integration.

## Related Documents

- [Response Documentation][ref-doc-response] - For standardized response structure
- [Request Validation Documentation][ref-doc-request-validation] - For validation error handling
- [Message Documentation][ref-doc-message] - For error message internationalization
- [Logger Documentation][ref-doc-logger] - For error logging and monitoring

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Exception Filters](#exception-filters)
  - [AppBaseExceptionFilter](#appbaseexceptionfilter)
  - [AppGeneralFilter](#appgeneralfilter)
  - [AppHttpFilter](#apphttpfilter)
  - [AppValidationFilter](#appvalidationfilter)
  - [AppValidationImportFilter](#appvalidationimportfilter)
- [Error Response Structure](#error-response-structure)
- [Response Metadata](#response-metadata)
- [Response Headers](#response-headers)
- [Usage](#usage)
  - [Throwing an error](#throwing-an-error)
  - [Error with message interpolation](#error-with-message-interpolation)
  - [Error wrapping a cause](#error-wrapping-a-cause)
  - [Defining a new exception](#defining-a-new-exception)

## Exception Filters

ACK NestJS Boilerplate uses 5 specialized exception filters registered globally in hierarchical order:

1. **AppValidationImportFilter** - Handles `FileImportException`
2. **AppValidationFilter** - Handles `RequestValidationException`
3. **AppBaseExceptionFilter** - Handles `AppBaseException` (every application error)
4. **AppHttpFilter** - Handles framework `HttpException` (route 404s, throttler, etc.)
5. **AppGeneralFilter** - Catches all unhandled exceptions

**Processing flow**:
```
Exception thrown
    ↓
Match specific filter? (validation import/request, AppBaseException, framework HTTP)
    ↓ No
AppGeneralFilter (fallback)
    ↓
Standardized error response + Sentry (if applicable)
```

**Common behavior**:
- Build metadata and headers via the shared `ResponseMetadataService` (`create()` / `setHeaders()`), sourced from the request store (`RequestLanguageStoreKey` / `RequestVersionStoreKey` / `RequestIdStoreKey` / `RequestCorrelationIdStoreKey`)
- Generate timestamp and timezone information
- Resolve localized error message using [Message System][ref-doc-message]
- Set response headers
- Format into `ResponseErrorDto`
- Send to Sentry (conditions vary by filter)

## Error Response Structure

All errors are formatted into `ResponseErrorDto`:

```typescript
{
  "statusCode": number,        // Custom status code or HTTP status
  "statusCodeKey": string,     // Status-code enum key (camelCase)
  "module": string,            // Owning module
  "message": string,           // Localized error message
  "metadata": { ... },         // Request/response metadata
  "data": { ... },            // Optional: additional error context
  "errors": [ ... ]           // Optional: validation errors
}
```

**Field descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `statusCode` | `number` | Yes | Custom status code for error identification |
| `statusCodeKey` | `string` | Yes | Status-code enum key (camelCase). Domain errors: enum key (e.g. `'notFound'`). Framework HTTP errors: camelCase HTTP status name (e.g. `'notFound'`). General/unknown: `'unknown'` |
| `module` | `string` | Yes | Owning module. Domain errors: module name (e.g. `'user'`). Framework HTTP errors: `'http'`. General/unknown: `'app'` |
| `message` | `string` | Yes | Localized message from [Message System][ref-doc-message] |
| `metadata` | `ResponseMetadataDto` | Yes | Request/response metadata |
| `data` | `unknown` | No | Additional error context |
| `errors` | `array` | No | Validation error details (validation exceptions only) |

## Response Metadata

`ResponseMetadataDto` provides contextual information:

```typescript
{
  "language": "en",
  "timestamp": 1660190937231,
  "timezone": "Asia/Jakarta",
  "version": "1",
  "repoVersion": "1.0.0",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "correlationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Field sources**:

| Field | Source | Fallback |
|-------|--------|----------|
| `language` | Request store `RequestLanguageStoreKey` | Config `message.language` |
| `timestamp` | `HelperService.dateGetTimestamp()` | - |
| `timezone` | `HelperService.dateGetZone()` | - |
| `version` | Request store `RequestVersionStoreKey` | Config `app.urlVersion.version` |
| `repoVersion` | Config `app.version` | - |
| `requestId` | Request store `RequestIdStoreKey` | - |
| `correlationId` | Request store `RequestCorrelationIdStoreKey` | - |

## Response Headers

All filters set these headers automatically:

```
x-custom-lang: en
x-timestamp: 1660190937231
x-timezone: Asia/Jakarta
x-version: 1
x-repo-version: 1.0.0
x-request-id: 550e8400-e29b-41d4-a716-446655440000
x-correlation-id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

## Exception Filters

### AppBaseExceptionFilter

**Location**: `src/app/filters/app.base-exception.filter.ts`

**Catches**: `@Catch(AppBaseException)` - every application error

**Use case**: All errors thrown by application code (services, guards, pipes) as dedicated exception classes extending `AppBaseException`.

**Behavior**:
- Reads `statusCode`, `httpStatus`, `messagePath`, `messageProperties`, `metadata`, and optional `data` directly from the exception instance
- Resolves the localized message via the [Message System][ref-doc-message]
- Merges `exception.metadata` into the response metadata
- Reports `exception.rawError` (or the exception itself) to Sentry only when `httpStatus >= 500`

**Response example**:
```json
{
  "statusCode": 5150,
  "statusCodeKey": "notFound",
  "module": "user",
  "message": "User not found",
  "metadata": { ... }
}
```

### AppGeneralFilter

**Location**: `src/app/filters/app.general.filter.ts`

**Catches**: `@Catch()` - all unhandled exceptions

**Use case**: Fallback for unexpected errors (database crashes, unhandled promise rejections, runtime errors)

**Behavior**:
- Always returns HTTP 500
- Uses message path `http.500`
- Sends all exceptions to Sentry

**Response example**:
```json
{
  "statusCode": 500,
  "statusCodeKey": "unknown",
  "module": "app",
  "message": "Internal Server Error",
  "metadata": { ... }
}
```

### AppHttpFilter

**Location**: `src/app/filters/app.http.filter.ts`

**Catches**: `@Catch(HttpException)` - framework HTTP exceptions only (route 404s, throttler 429, payload limits, etc.)

**Use case**: NestJS/framework `HttpException`s. Application code no longer throws `HttpException`; every application error is an `AppBaseException` subclass handled by `AppBaseExceptionFilter`.

**Path validation**: Redirects invalid paths (not starting with `globalPrefix` or `docPrefix`) to `{globalPrefix}/public/hello` with HTTP 308

**Message**: Resolves the message path `http.{statusCode}` via the [Message System][ref-doc-message]

**Sentry integration**: Only sends exceptions with HTTP status ≥ 500

**Response example**:
```json
{
  "statusCode": 404,
  "statusCodeKey": "notFound",
  "module": "http",
  "message": "Not Found",
  "metadata": { ... }
}
```

### AppValidationFilter

**Location**: `src/app/filters/app.validation.filter.ts`

**Catches**: `@Catch(RequestValidationException)` - request validation errors

**Use case**: Request body, query parameters, and path parameters validation failures using [class-validator][ref-class-validator]

**Behavior**:
- Formats field-specific validation errors
- Uses `MessageService.setValidationMessage()`
- Does not send to Sentry

**Response example**:
```json
{
  "statusCode": 5030,
  "statusCodeKey": "validation",
  "module": "request",
  "message": "There are validation errors.",
  "errors": [
    {
      "key": "isEmail",
      "property": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "metadata": { ... }
}
```

See [Request Validation][ref-doc-request-validation] for details.

### AppValidationImportFilter

**Location**: `src/app/filters/app.validation-import.filter.ts`

**Catches**: `@Catch(FileImportException)` - file import validation errors

**Use case**: CSV file import validation failures using [class-validator][ref-class-validator]

**Behavior**:
- Formats row-level validation errors
- Uses `MessageService.setValidationImportMessage()`
- Does not send to Sentry

**Response example**:
```json
{
  "statusCode": 5030,
  "statusCodeKey": "validation",
  "module": "file",
  "message": "The imported data failed validation.",
  "errors": [
    {
      "row": 2,
      "errors": [
        {
          "key": "isEmail",
          "property": "email",
          "message": "Email must be a valid email address"
        }
      ]
    }
  ],
  "metadata": { ... }
}
```

See [Request Validation][ref-doc-request-validation] for details.

## Usage

Application code throws a dedicated exception class per error, each extending `AppBaseException`. Inline `HttpException` plus an object is no longer used. Each class fixes its own `statusCode`, `httpStatus`, `messagePath`, and `statusCodeKey`, and lives in the `exceptions/` folder of the module that owns its status-code enum.

### Throwing an error

```typescript
throw new UserNotFoundException();
```

### Error with message interpolation

When the i18n message has placeholders, the constructor takes explicit named params and maps them to `messageProperties`:

```typescript
throw new UserPasswordMustNewException(period);
```

The class wires it internally:
```typescript
super('auth.error.passwordMustNew', { messageProperties: { period } });
```

**Message file** (`en/auth.json`):
```json
{
  "error": {
    "passwordMustNew": "Password must be different; last changed {period}"
  }
}
```

### Error wrapping a cause

For a caught error, pass the cause. It is reported to Sentry for 5xx errors and never serialized into the response body:

```typescript
try {
  // ...
} catch (err: unknown) {
  throw new AppUnknownException(err);
}
```

### Defining a new exception

Add a numeric status-code enum entry, then the class:

```typescript
export class ExampleSomethingException extends AppBaseException {
    readonly module = 'example';
    readonly statusCode = EnumExampleStatusCodeError.something;
    readonly statusCodeKey = EnumExampleStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('example.error.something');
    }
}
```



<!-- REFERENCES -->

[ref-class-validator]: https://github.com/typestack/class-validator
[ref-nestjs-exception-filters]: https://docs.nestjs.com/exception-filters

[ref-doc-response]: response.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-message]: message.md
[ref-doc-logger]: logger.md
