# Handling Error

## Overview

The error handling system in ACK NestJS Boilerplate provides a comprehensive way to handle exceptions throughout the application. It uses NestJS's exception filter mechanism to catch and transform all errors into standardized HTTP responses with proper formatting, internationalization support, and monitoring integration.

**Prerequisites**: Before reading this documentation, please review:
- [Response Structure][ref-doc-response]
- [Request Validation][ref-doc-request-validation]
- [Security and Middleware][ref-doc-security-and-middleware]
- [Message System][ref-doc-message]


## Table of Contents

- [Overview](#overview)
- [Exception Filters](#exception-filters)
  - [AppGeneralFilter](#appgeneralfilter)
  - [AppHttpFilter](#apphttpfilter)
  - [AppValidationFilter](#appvalidationfilter)
  - [AppValidationImportFilter](#appvalidationimportfilter)
- [Error Response Structure](#error-response-structure)
- [Response Metadata](#response-metadata)
- [Response Headers](#response-headers)
- [Message Resolution](#message-resolution)
- [Throwing Custom Errors](#throwing-custom-errors)
- [Sentry Integration](#sentry-integration)
- [Examples](#examples)
  - [Custom Error with Properties](#custom-error-with-properties)
  - [Standard HTTP Exception](#standard-http-exception)
  - [Validation Error](#validation-error)

## Exception Filters

The boilerplate provides 4 specialized exception filters located in `src/app/filters/*`:

### AppGeneralFilter

Catches all unhandled exceptions that don't match other filters. Converts any unhandled error into a standardized `500 Internal Server Error` response.
```typescript
@Catch()
export class AppGeneralFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    // Catches everything not handled by other filters
    // Always returns HTTP 500
  }
}
```

**Use case**: Fallback for unexpected errors (database crashes, unhandled promise rejections, etc.)

### AppHttpFilter

Handles all `HttpException` instances thrown by NestJS or your application code.
```typescript
@Catch(HttpException)
export class AppHttpFilter implements ExceptionFilter {
  async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
    // Handles standard HTTP exceptions
  }
}
```

**Features**:
- Path validation (redirects invalid paths to `/public/hello`)
- Extracts custom error metadata from exception responses
- Only sends errors with status ≥ 500 to Sentry

### AppValidationFilter

Handles `RequestValidationException` for request body, query parameters, and path parameters validation using [class-validator][ref-class-validator].
```typescript
@Catch(RequestValidationException)
export class AppValidationFilter implements ExceptionFilter {
  async catch(exception: RequestValidationException, host: ArgumentsHost): Promise<void> {
    // Handles request validation errors
  }
}
```

See [Request Validation][ref-doc-request-validation] for more details.

### AppValidationImportFilter

Handles `FileImportException` specifically for Excel file import validation using [class-validator][ref-class-validator].
```typescript
@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
  async catch(exception: FileImportException, host: ArgumentsHost): Promise<void> {
    // Handles file import validation errors
  }
}
```

See [Request Validation][ref-doc-request-validation] for more details.


## Error Response Structure

All errors are formatted into `ResponseErrorDto`:
```typescript
{
  "statusCode": 400,
  "message": "Validation failed",
  "metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users",
    "version": "1",
    "repoVersion": "1.0.0"
  },
  "errors": [...], // Optional: validation errors
  "data": {...}    // Optional: additional error context
}
```

**Fields**:
- `statusCode`: Custom status code (not HTTP status)
- `message`: Localized error message
- `metadata`: Request/response metadata (see [Response Metadata](#response-metadata))
- `errors`: Validation error details (only for validation exceptions)
- `data`: Additional error context (optional)

## Response Metadata

`ResponseMetadataDto` provides contextual information about the request/response:

| Field | Description | Source |
|-------|-------------|--------|
| `language` | Response language | `request.__language` or config default |
| `timestamp` | Unix timestamp | Generated from current date |
| `timezone` | Server timezone | Generated from current date |
| `path` | Request path | `request.path` |
| `version` | API version | `request.__version` or config default |
| `repoVersion` | Application version | Config `app.version` |

**Custom metadata**: You can pass additional metadata through exception's `_metadata` property (see [Throwing Custom Errors](#throwing-custom-errors)).

## Response Headers

All exception filters automatically set these response headers:
```
x-custom-lang: en
x-timestamp: 1660190937231
x-timezone: Asia/Jakarta
x-version: 1
x-repo-version: 1.0.0
```

## Message Resolution

The `message` field contains a message path that gets resolved by `MessageService` using [nestjs-i18n][ref-nestjs-i18n]. The service:

1. Takes the message path (e.g., `user.error.statusInvalid`)
2. Resolves it based on `x-custom-lang` header
3. Interpolates any `messageProperties` if provided
4. Returns the localized message string

See [Message System][ref-doc-message] for more details.

## Throwing Custom Errors

Use NestJS built-in exceptions with custom properties:
```typescript
throw new BadRequestException({
  statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
  message: 'user.error.statusInvalid',
  _metadata: {
    customProperty: {
      messageProperties: {
        status: user.status.toLowerCase(),
      },
    },
  },
});
```

**Parameters**:
- `statusCode`: Custom status code (not HTTP status)
- `message`: Message path for i18n resolution
- `_metadata.customProperty.messageProperties`: Variables for message interpolation
- `_metadata`: Any additional metadata to merge with `ResponseMetadataDto`

## Sentry Integration

**AppGeneralFilter**: Sends all unhandled exceptions to Sentry

**AppHttpFilter**: Sends only server errors (status ≥ 500) to Sentry

Both filters include error handling for Sentry failures to prevent cascade errors.

## Examples

### Custom Error with Properties
```typescript
// Throwing exception
throw new BadRequestException({
  statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
  message: 'user.error.statusInvalid',
  _metadata: {
    customProperty: {
      messageProperties: {
        status: user.status.toLowerCase(),
      },
    },
  },
});

// Message
{
  "error": {
    "statusInvalid": "User status {status} is invalid"
  }
}

// Response
{
  "statusCode": 5100,
  "message": "User status active is invalid",
  "metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users/123",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```

### Standard HTTP Exception
```typescript
// Throwing exception
throw new NotFoundException();

// Response
{
  "statusCode": 404,
  "message": "Not Found",
  "metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users/999",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```

### Validation Error
```typescript
// Request body
{
  "email": "invalid-email",
  "password": "123"
}

// Response
{
  "statusCode": 422,
  "message": "Validation error",
  "errors": [
    {
      "property": "email",
      "message": "Email must be a valid email address"
    },
    {
      "property": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "metadata": {
    "language": "en",
    "timestamp": 1660190937231,
    "timezone": "Asia/Jakarta",
    "path": "/api/v1/users",
    "version": "1",
    "repoVersion": "1.0.0"
  }
}
```

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
[ref-doc-audit-activity-log]: docs/audit-activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-message]: docs/message.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md