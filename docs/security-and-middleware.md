# Security and Middleware Documentation

This documentation explains the features and usage of **Request Middleware Module**: Located at `src/common/request/middlewares`

## Overview

ACK NestJS Boilerplate implements a comprehensive security and middleware layer for HTTP request/response processing. All middleware is centrally managed through `RequestMiddlewareModule` and applied globally to all routes using the wildcard pattern `{*wildcard}`.

```typescript
consumer
  .apply(
    RequestRequestIdMiddleware,      // 1. Request & Correlation IDs
    RequestHelmetMiddleware,         // 2. Security headers
    RequestBodyParserMiddleware,     // 3. Body parsing
    RequestCorsMiddleware,           // 4. CORS handling
    RequestUrlVersionMiddleware,     // 5. API version extraction
    RequestResponseTimeMiddleware,   // 6. Response time tracking
    RequestCustomLanguageMiddleware, // 7. Language detection
    RequestCompressionMiddleware     // 8. Response compression
  )
  .forRoutes('{*wildcard}');
```

## Related Documents

- [Authentication][ref-doc-authentication]
- [Authorization][ref-doc-authorization]
- [Configuration][ref-doc-configuration]
- [Environment][ref-doc-environment]

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Authentication & Authorization](#authentication--authorization)
- [Helmet](#helmet)
- [Rate Limiting](#rate-limiting)
- [CORS](#cors)
- [Environment Protection](#environment-protection)
- [Request & Correlation IDs](#request--correlation-ids)
- [Body Parser](#body-parser)
- [URL Versioning](#url-versioning)
- [Custom Language](#custom-language)
- [Response Compression](#response-compression)
- [Response Time](#response-time)
- [Request Timeout](#request-timeout)
- [Decorators](#decorators)
  - [@RequestTimeout](#requesttimeout)
  - [@RequestEnvProtected](#requestenvprotected)
  - [@RequestIPAddress](#requestipaddress)
  - [@RequestUserAgent](#requestuseragent)


## Authentication & Authorization

ACK NestJS Boilerplate includes comprehensive authentication and authorization systems. See dedicated documentation:

- [Authentication][ref-doc-authentication] - JWT, OAuth, API Keys, sessions, password management
- [Authorization][ref-doc-authorization] - RBAC, policy abilities, user protection

## Helmet

Applies protective HTTP headers using [Helmet][ref-helmet].

**Implementation:** `RequestHelmetMiddleware`

**Usage:** Automatically applied to all routes.

## Rate Limiting

Prevents abuse using [Throttler][ref-throttler].

**Implementation:**
```typescript
ThrottlerModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    throttlers: [{
      ttl: config.get<number>('request.throttle.ttlInMs'),
      limit: config.get<number>('request.throttle.limit'),
    }],
  }),
})
```

**Skip Rate Limiting:**
```typescript
@SkipThrottle()
@Get('/unlimited')
async endpoint() {}
```

**Configuration:** See [Configuration][ref-doc-configuration]

## CORS

Manages cross-origin resource sharing.

**Implementation:** `RequestCorsMiddleware`

**Features:**
- Dynamic origin validation
- Automatic credential handling
- Configurable methods and headers
- Preflight request support

**Configuration:** See [Configuration][ref-doc-configuration]

## Environment Protection

Restricts endpoint access based on environment.

**Implementation:** `RequestEnvGuard`

**Usage:**
```typescript
@RequestEnvProtected(EnumAppEnvironment.DEVELOPMENT)
@Get('/debug')
async debugEndpoint() {}
```

**Configuration:** See [Configuration][ref-doc-configuration]

## Request & Correlation IDs

Generates unique identifiers for request tracking.

**Implementation:** `RequestRequestIdMiddleware`

**Request Properties:**
```typescript
interface IRequestApp extends Request {
  id: string;            // UUID v7 request ID
  correlationId: string; // Correlation ID for distributed tracing
  __version: string;     // API version
  __language: string;    // Language preference
}
```

## Body Parser

Parses request bodies based on content-type.

**Implementation:** `RequestBodyParserMiddleware`

**Supported Content Types:**
- `application/json`
- `application/x-www-form-urlencoded`
- `text/*`
- `application/octet-stream`
- `multipart/form-data` (skipped, handled by Multer)

**Configuration:** See [Configuration][ref-doc-configuration]

## URL Versioning

Extracts API version from URLs.

**Implementation:** `RequestUrlVersionMiddleware`

**URL Pattern:**
```
/{globalPrefix}/{versionPrefix}{version}/resource
Example: /api/v1/users
```

**Request Property:**
```typescript
req.__version  // Extracted version number
```

**Configuration:** See [Configuration][ref-doc-configuration]

## Custom Language

Processes `x-custom-lang` header for internationalization.

**Implementation:** `RequestCustomLanguageMiddleware`

**Usage:**
```bash
# Request header
x-custom-lang: id
```

**Request Property:**
```typescript
req.__language  // Validated language code
```

**Configuration:** See [Configuration][ref-doc-configuration]

## Response Compression

Applies gzip/deflate compression using [compression][ref-compression].

**Implementation:** `RequestCompressionMiddleware`

**Usage:** Automatically applied to all responses.

## Response Time

Measures request duration using [response-time][ref-response-time].

**Implementation:** `RequestResponseTimeMiddleware`

**Header Example:**
```
X-Response-Time: 123.456ms
```

## Request Timeout

Prevents long-running requests.

**Implementation:** `RequestTimeoutInterceptor`

**Global Registration:**
```typescript
app.useGlobalInterceptors(new RequestTimeoutInterceptor(configService, reflector));
```

**Custom Timeout:**
```typescript
@RequestTimeout('60s')
@Get('/long-running')
async operation() {}
```

**Supported Formats:** [ms][ref-ms] format (`'2s'`, `'1m'`, `'5h'`)

**Configuration:** See [Configuration][ref-doc-configuration]

## Decorators

### @RequestTimeout

Sets custom timeout for specific endpoints.

**Signature:**
```typescript
RequestTimeout(seconds: ms.StringValue): MethodDecorator
```

**Example:**
```typescript
@RequestTimeout('2m')
@Post('/process')
async processData() {}
```

### @RequestEnvProtected

Restricts endpoint access based on environment.

**Signature:**
```typescript
RequestEnvProtected(...envs: EnumAppEnvironment[]): MethodDecorator
```

**Example:**
```typescript
@RequestEnvProtected(EnumAppEnvironment.DEVELOPMENT)
@Get('/admin/clear-cache')
async clearCache() {}
```

### @RequestIPAddress

Extracts real client IP address from request using [nestjs-real-ip][ref-nestjs-real-ip].

**Signature:**
```typescript
RequestIPAddress(): ParameterDecorator
```

**Example:**
```typescript
@Get('/check-ip')
async checkIP(@RequestIPAddress() ip: string) {
  return { ip };
}
```

### @RequestUserAgent

Parses User-Agent information using [ua-parser-js][ref-ua-parser-js].

**Signature:**
```typescript
RequestUserAgent(): ParameterDecorator
```

**Example:**
```typescript
@Get('/device-info')
async getDeviceInfo(@RequestUserAgent() userAgent: UAParser.IResult) {
  return {
    browser: userAgent.browser,
    os: userAgent.os,
    device: userAgent.device
  };
}
```

**Response Structure:**
```typescript
interface IResult {
  browser: { name?: string; version?: string };
  os: { name?: string; version?: string };
  device: { model?: string; type?: string; vendor?: string };
  engine: { name?: string; version?: string };
  cpu: { architecture?: string };
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
[ref-helmet]: https://helmetjs.github.io/
[ref-throttler]: https://docs.nestjs.com/security/rate-limiting
[ref-compression]: https://github.com/expressjs/compression
[ref-response-time]: https://github.com/expressjs/response-time
[ref-ms]: https://github.com/vercel/ms
[ref-nestjs-real-ip]: https://github.com/p-j/nestjs-real-ip
[ref-ua-parser-js]: https://github.com/faisalman/ua-parser-js

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
