# Handling Error Documentation

> This documentation explains the features and usage of **Exception Filter Module**: Located at `src/app/filters`

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
- [How It Works](#how-it-works)
- [Error Response Structure](#error-response-structure)
- [Response Metadata](#response-metadata)
- [Response Headers](#response-headers)
- [Exception Filters](#exception-filters)
  - [AppGeneralFilter](#appgeneralfilter)
  - [AppHttpFilter](#apphttpfilter)
  - [AppValidationFilter](#appvalidationfilter)
  - [AppValidationImportFilter](#appvalidationimportfilter)
- [Usage](#usage)
  - [Standard HTTP Exception](#standard-http-exception)
  - [Custom Error with Message Properties](#custom-error-with-message-properties)
  - [Custom Error with Additional Data](#custom-error-with-additional-data)
  - [Custom Error with Metadata](#custom-error-with-metadata)

## How It Works

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
  statusCode: number;           // Custom status code
  message: string;              // Message path for i18n
  messageProperties?: object;   // Variables for message interpolation
  data?: T;                     // Additional error context
  metadata?: object;            // Additional metadata to merge
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

**Use case**: Excel file import validation failures using [class-validator][ref-class-validator]

**Behavior**:
- Formats row-level validation errors with file/sheet information
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
      "file": "users.xlsx",
      "sheet": "Sheet1",
      "key": "isEmail",
      "property": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "metadata": { ... }
}
```

See [Request Validation][ref-doc-request-validation] for details.

## Usage

### Standard HTTP Exception

For standard HTTP errors:

```typescript
import { NotFoundException } from '@nestjs/common';

throw new NotFoundException();
// HTTP 404, statusCode: 404, message: "Not Found"
```

See [NestJS Exception Filters][ref-nestjs-exception-filters] for available exceptions.

### Custom Error with Message Properties

Use message properties for dynamic message interpolation:

```typescript
import { BadRequestException } from '@nestjs/common';

throw new BadRequestException({
  statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
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

### Custom Error with Additional Data

Add contextual data to help debugging:

```typescript
throw new BadRequestException({
  statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
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

### Custom Error with Metadata

Add custom properties to metadata:

```typescript
throw new BadRequestException({
  statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
  message: 'user.error.statusInvalid',
  messageProperties: {
    status: user.status.toLowerCase(),
  },
  metadata: {
    attemptedOperation: 'statusChange',
    resourceType: 'user',
  },
});
```

**Response**:
```json
{
  "statusCode": 5100,
  "message": "User status active is invalid",
  "metadata": {
    "attemptedOperation": "statusChange",
    "resourceType": "user",
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users/123/status",
    "version": "1",
    "repoVersion": "1.0.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "correlationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
}
```

**Note**: Custom metadata is merged first, then default metadata (default takes precedence for same keys).

<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-nestjs-exception-filters]: https://docs.nestjs.com/exception-filters#built-in-http-exceptions
[ref-nestjs-i18n]: https://nestjs-i18n.com/
[ref-class-validator]: https://github.com/typestack/class-validator
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
