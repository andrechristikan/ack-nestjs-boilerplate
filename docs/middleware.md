# Overview

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
```
