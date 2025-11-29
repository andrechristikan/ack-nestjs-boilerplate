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
[ref-doc-how-to-handling-error]: docs/how-to-handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-internationalization]: docs/internationalization.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response-structure]: docs/response-structure.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md

<!-- # Overview

Middleware functions are functions that have access to the request object (req), the response object (res), and the next middleware function in the application's request-response cycle.

The middleware is configured in `src/app/app.middleware.module.ts` and applied globally to all routes using the pattern `{*wildcard}`. The middleware is executed in the order they are applied.

This documentation explains the features and usage of:
- **App Middleware Module**: Located at `src/app/app.middleware.module.ts`
- **Middleware Module**: Located at `src/app/middlewares/*.middleware.ts`

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Middleware Modules](#middleware-modules)
    - [Request ID Middleware](#request-id-middleware)
    - [Helmet Middleware](#helmet-middleware)
    - [Body Parser Middleware](#body-parser-middleware)
    - [CORS Middleware](#cors-middleware)
    - [URL Version Middleware](#url-version-middleware)
    - [Response Time Middleware](#response-time-middleware)
    - [Custom Language Middleware](#custom-language-middleware)
  - [Global Guards and Filters](#global-guards-and-filters)
    - [ThrottlerGuard](#throttlerguard)

## Middleware Modules

All middleware is registered in the `AppMiddlewareModule` using the `configure` method:

### Request ID Middleware
**File**: `src/app/middlewares/app.request-id.middleware.ts`

Assigns a unique UUID to each incoming request, making it easier to track requests through logs and debugging.

```typescript
@Injectable()
export class AppRequestIdMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        req.id = uuid();
        next();
    }
}
```

This middleware creates a UUID v4 for each request and attaches it to the request object, which can then be used by loggers and other components to correlate logs for a single request.

### Helmet Middleware
**File**: `src/app/middlewares/app.helmet.middleware.ts`

Secures the application by setting various HTTP headers to help protect against common web vulnerabilities like XSS attacks, content type sniffing, etc.

```typescript
@Injectable()
export class AppHelmetMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        helmet()(req, res, next);
    }
}
```

This middleware adds the following security headers by default:
- Content-Security-Policy
- X-DNS-Prefetch-Control
- Expect-CT
- X-Frame-Options
- X-Powered-By
- Strict-Transport-Security
- X-Download-Options
- X-Content-Type-Options
- Origin-Agent-Cluster
- X-Permitted-Cross-Domain-Policies
- Referrer-Policy
- X-XSS-Protection
- Cross-Origin-Resource-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Embedder-Policy

### Body Parser Middleware
**File**: `src/app/middlewares/app.body-parser.middleware.ts`

Parses incoming request bodies in different formats:
- `AppJsonBodyParserMiddleware` - Parses JSON requests
- `AppTextBodyParserMiddleware` - Parses text requests
- `AppRawBodyParserMiddleware` - Parses raw binary data
- `AppUrlencodedBodyParserMiddleware` - Parses URL-encoded form data

All body parsers are configured with size limits defined in `middleware.config.ts`:

```typescript
body: {
    json: { maxFileSize: bytes('100kb') },
    raw: { maxFileSize: bytes('100kb') },
    text: { maxFileSize: bytes('100kb') },
    urlencoded: { maxFileSize: bytes('100kb') },
}
```

### CORS Middleware
**File**: `src/app/middlewares/app.cors.middleware.ts`

Enables Cross-Origin Resource Sharing (CORS) with configurable options:
- Allowed origins
- Allowed methods
- Allowed headers
- Credentials support

Configuration is managed through environment variables and defaults in `middleware.config.ts`.

### URL Version Middleware
**File**: `src/app/middlewares/app.url-version.middleware.ts`

Extracts API version information from the URL path and makes it available in the request object.
This enables version-based routing throughout the application.

### Response Time Middleware
**File**: `src/app/middlewares/app.response-time.middleware.ts`

Measures and records the response time for each request, which helps with performance monitoring.

### Custom Language Middleware
**File**: `src/app/middlewares/app.custom-language.middleware.ts`

Detects and sets the preferred language for the request based on the `x-custom-lang` header.
This enables i18n support throughout the application.

## Global Guards and Filters

In addition to middleware, the application uses global guards and filters:

### ThrottlerGuard
Prevents abuse through rate limiting. Configuration is defined in `middleware.config.ts`:

```typescript
throttle: {
    ttl: ms('500'), // 0.5 secs
    limit: 10, // max request per request reset time
}
``` -->
