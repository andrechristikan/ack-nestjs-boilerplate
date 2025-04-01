# Overview

Middleware functions are functions that have access to the request object (req), the response object (res), and the next middleware function in the application's request-response cycle. ACK NestJS Boilerplate uses several middleware components to process HTTP requests before they reach the route handlers.


The middleware is configured in `src/app/app.middleware.module.ts` and applied globally to all routes using the pattern `{*wildcard}`. The middleware is executed in the order they are applied.

## Table of Contents
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


All middleware is registered in the `AppMiddlewareModule` using the `configure` method:

## Middleware Modules

### Request ID Middleware
**File**: `src/app/middlewares/app.request-id.middleware.ts`

Assigns a unique UUID to each incoming request, making it easier to track requests through logs and debugging.

### Helmet Middleware
**File**: `src/app/middlewares/app.helmet.middleware.ts`

Secures the application by setting various HTTP headers to help protect against common web vulnerabilities like XSS attacks, content type sniffing, etc.

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
