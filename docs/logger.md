# Logger Documentation

This documentation explains the features and usage of **Logger Module**: Located at `src/common/logger`

## Overview

Comprehensive logging system using Pino with file rotation, sensitive data redaction, and custom serializers for request/response logging. The system includes HTTP request/response logging, automatic sensitive data redaction, file rotation with compression, configurable log levels, pretty printing for development, route exclusion for health checks, request ID tracking across services, and memory usage and uptime debugging for non-production environments.

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
- [Usage](#usage)
  - [Log Levels](#log-levels)
- [Sensitive Data Redaction](#sensitive-data-redaction)
  - [Example](#example)
- [File Logging](#file-logging)
- [Auto Logging](#auto-logging)
  - [Excluded Routes](#excluded-routes)
- [Console Output](#console-output)
  - [Pretty Mode](#pretty-mode-logger_prettiertrue)
  - [JSON Mode](#json-mode-logger_prettierfalse)
  - [Debug Information](#debug-information-non-production)
- [Request ID Tracking](#request-id-tracking)


## Configuration

Configuration is managed in `src/configs/logger.config.ts`. For environment variables, see [Environment Documentation][ref-doc-environment].

| Option | Description | Default |
|--------|-------------|---------|
| `enable` | Enable/disable logging | `false` |
| `level` | Minimum log level (`error`, `warn`, `info`, `debug`) | `debug` |
| `intoFile` | Write logs to files | `false` |
| `filePath` | Directory path for log files | `/logs` |
| `auto` | Enable automatic HTTP request/response logging | `false` |
| `prettier` | Enable pretty-printing in console | `false` |

## Usage

Use [NestJS][ref-nestjs] Logger throughout the application:

```typescript
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
}
```

### Log Levels

```typescript
this.logger.error('Error message');   // error level
this.logger.warn('Warning message');  // warn level
this.logger.log('Info message');      // info level
this.logger.debug('Debug message');   // debug level
```

## Sensitive Data Redaction

The logger automatically redacts sensitive fields defined in `src/common/logger/constants/logger.constant.ts`:

```typescript
export const LOGGER_SENSITIVE_FIELDS: string[] = [
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
    // Add more fields as needed
];
```

Sensitive fields in these paths are automatically replaced with `[REDACTED]`:

```typescript
export const LOGGER_SENSITIVE_PATHS = [
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

### Example

**Request with sensitive data:**

```json
{
  "username": "john",
  "password": "secret123",
  "apiKey": "abc-def-ghi"
}
```

**Logged as:**

```json
{
  "username": "john",
  "password": "[REDACTED]",
  "apiKey": "[REDACTED]"
}
```

**Array Truncation:**

Arrays longer than 10 items are automatically truncated:

```json
{
  "items": [
    "item1",
    "item2",
    // ... first 10 items
    { "truncated": "...[TRUNCATED] - total length 50" }
  ]
}
```

## File Logging

Enable file logging by setting `LOGGER_INTO_FILE=true`. Logs are written to `./logs/api.log` with automatic rotation:

- **Size limit**: 10MB per file
- **Rotation**: Daily or when size limit reached
- **Compression**: Gzip compression for rotated files
- **Retention**: Maximum 10 files, older than 7 days removed

**File structure:**

```
logs/
├── api.log              # Current log file
├── api.log.1.gz         # Rotated log (yesterday)
├── api.log.2.gz         # Rotated log (2 days ago)
└── ...
```

## Auto Logging

Enable automatic HTTP request/response logging with `LOGGER_AUTO=true`.

### Excluded Routes

Routes excluded from auto-logging (defined in `logger.constant.ts`):

```typescript
export const LOGGER_EXCLUDED_ROUTES: string[] = [
    '/api/health*',
    '/metrics*',
    '/favicon.ico',
    '/docs*',
    '/',
];
```

## Console Output

### Pretty Mode (`LOGGER_PRETTIER=true`)

Development-friendly colored output with structured formatting:
```
INFO [2025-12-01 15:18:54.496 +0700]: [ACKNestJs-Main] Logger Debug Level: debug
    service: {
      "name": "ACKNestJs",
      "environment": "local",
      "version": "8.0.0"
    }
    debug: {
      "memory": {
        "rss": 449,
        "heapUsed": 182
      },
      "uptime": 2
    }
```

### JSON Mode (`LOGGER_PRETTIER=false`)

Production-optimized structured JSON:
```json
{
  "level": 30,
  "timestamp": 1764577182750,
  "service": {
    "name": "ACKNestJs",
    "environment": "local",
    "version": "8.0.0"
  },
  "context": "ACKNestJs-Main",
  "debug": {
    "memory": {
      "rss": 413,
      "heapUsed": 181
    },
    "uptime": 1
  },
  "msg": "Logger Debug Level: debug"
}
```

### Debug Information (Non-Production)

In non-production environments, additional debug info is included:

- **memory.rss**: Resident Set Size in MB
- **memory.heapUsed**: Heap used in MB
- **uptime**: Process uptime in seconds

## Request ID Tracking

The logger extracts request IDs from these headers (in order):
```typescript
export const LOGGER_REQUEST_ID_HEADERS = [
    'x-correlation-id',
    'x-request-id',
];
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
[ref-pino]: https://getpino.io

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