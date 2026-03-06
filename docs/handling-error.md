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
  - [AppGeneralFilter](#appgeneralfilter)
  - [AppHttpFilter](#apphttpfilter)
  - [AppValidationFilter](#appvalidationfilter)
  - [AppValidationImportFilter](#appvalidationimportfilter)
- [Error Response Structure](#error-response-structure)
- [Response Metadata](#response-metadata)
- [Response Headers](#response-headers)
- [Usage](#usage)
  - [Error with Default HTTP Exception](#error-with-default-http-exception)
  - [Custom Error with Message Properties](#custom-error-with-message-properties)
  - [Custom Error with Additional Data](#custom-error-with-additional-data)

## Exception Filters

ACK NestJS Boilerplate uses 4 specialized exception filters registered globally in hierarchical order:

1. **AppValidationImportFilter** - Handles `FileImportException`
2. **AppValidationFilter** - Handles `RequestValidationException`
3. **AppHttpFilter** - Handles `HttpException`
4. **AppGeneralFilter** - Catches all unhandled exceptions

**Processing flow**:
```
Exception thrown
    ↓
Match specific filter? (validation import/request, HTTP)
    ↓ No
AppGeneralFilter (fallback)
    ↓
Standardized error response + Sentry (if applicable)
```

**Common behavior**:
- Extract metadata from request (language, version, requestId, correlationId)
- Generate timestamp and timezone information
- Resolve localized error message using [Message System][ref-doc-message]
- Set response headers
- Format into `ResponseErrorDto`
- Send to Sentry (conditions vary by filter)

## Error Response Structure

All errors are formatted into `ResponseErrorDto`:

```typescript
{
  "statusCode": number,        // Custom status code (not HTTP status)
  "message": string,           // Localized error message
  "metadata": { ... },         // Request/response metadata
  "errors": [ ... ],          // Optional: validation errors
  "data": { ... }             // Optional: additional error context
}
```

**Field descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `statusCode` | `number` | Yes | Custom status code for error identification |
| `message` | `string` | Yes | Localized message from [Message System][ref-doc-message] |
| `metadata` | `ResponseMetadataDto` | Yes | Request/response metadata |
| `errors` | `array` | No | Validation error details (validation exceptions only) |
| `data` | `unknown` | No | Additional error context (custom exceptions only) |

## Response Metadata

`ResponseMetadataDto` provides contextual information:

```typescript
{
  "language": "en",
  "timestamp": 1660190937231,
  "timezone": "Asia/Jakarta",
  "path": "/api/v1/users",
  "version": "1",
  "repoVersion": "1.0.0",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "correlationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Field sources**:

| Field | Source | Fallback |
|-------|--------|----------|
| `language` | `request.__language` | Config `message.language` |
| `timestamp` | `HelperService.dateGetTimestamp()` | - |
| `timezone` | `HelperService.dateGetZone()` | - |
| `path` | `request.path` | - |
| `version` | `request.__version` | Config `app.urlVersion.version` |
| `repoVersion` | Config `app.version` | - |
| `requestId` | `request.id` | - |
| `correlationId` | `request.correlationId` | - |

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
  "message": "Internal Server Error",
  "metadata": { ... }
}
```

### AppHttpFilter

**Location**: `src/app/filters/app.http.filter.ts`

**Catches**: `@Catch(HttpException)` - all HTTP exceptions

**Use case**: Standard and custom HTTP exceptions from application code

**Path validation**: Redirects invalid paths (not starting with `globalPrefix` or `docPrefix`) to `{globalPrefix}/public/hello` with HTTP 308

**Custom exception support**: Extracts custom properties if exception response implements `IAppException`:
```typescript
interface IAppException<T = unknown> {
  statusCode: number;                         // Custom status code
  message: string;                            // Message path for i18n
  messageProperties?: Record<string, string | number>; // Variables for message interpolation
  data?: T;                                   // Additional error context
  metadata?: Record<string, string | number>; // Additional metadata to merge into response
  errors?: IMessageValidationError[];         // Optional validation error details
  _error?: unknown;                           // Internal error object (not serialized)
}
```

**Sentry integration**: Only sends exceptions with HTTP status ≥ 500

**Response example** (standard):
```json
{
  "statusCode": 404,
  "message": "Not Found",
  "metadata": { ... }
}
```

**Response example** (custom):
```json
{
  "statusCode": 5100,
  "message": "User status active is invalid",
  "data": { "userId": "123" },
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
  "statusCode": 422,
  "message": "Validation error",
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
  "statusCode": 422,
  "message": "File import validation failed",
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

### Error with Default HTTP Exception

For standard HTTP errors:

```typescript
throw new NotFoundException();
// HTTP 404, statusCode: 404, message: "Not Found"
```

See [NestJS Exception Filters][ref-nestjs-exception-filters] for available exceptions.

### Error with Message Properties

Use message properties for dynamic message interpolation:

```typescript
throw new BadRequestException({
  statusCode: EnumUserStatusCodeError.statusInvalid,
  message: 'user.error.statusInvalid',
  messageProperties: {
    status: user.status.toLowerCase(),
  },
});
```

**Message file** (`en/user.json`):
```json
{
  "error": {
    "statusInvalid": "User status {status} is invalid"
  }
}
```

**Response**:
```json
{
  "statusCode": 5100,
  "message": "User status active is invalid",
  "metadata": { ... }
}
```

### Error with Additional Data

Add contextual data to help debugging:

```typescript
throw new BadRequestException({
  statusCode: EnumUserStatusCodeError.statusInvalid,
  message: 'user.error.statusInvalid',
  messageProperties: {
    status: user.status.toLowerCase(),
  },
  data: {
    userId: user._id,
    currentStatus: user.status,
    allowedStatuses: ['active', 'inactive'],
  },
});
```

**Response**:
```json
{
  "statusCode": 5100,
  "message": "User status active is invalid",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "currentStatus": "active",
    "allowedStatuses": ["active", "inactive"]
  },
  "metadata": { ... }
}
```



<!-- REFERENCES -->

[ref-class-validator]: https://github.com/typestack/class-validator
[ref-nestjs-exception-filters]: https://docs.nestjs.com/exception-filters

[ref-doc-response]: response.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-message]: message.md
[ref-doc-logger]: logger.md
