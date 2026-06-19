# Security and Middleware Documentation

This documentation explains the features and usage of **Request Middleware Module**: Located at `src/common/request/middlewares`

## Overview

ACK NestJS Boilerplate implements a comprehensive security and middleware layer for HTTP request/response processing. All middleware is centrally managed through `RequestMiddlewareModule` and applied globally to all routes using the wildcard pattern `{*wildcard}`.

```typescript
consumer
  .apply(
    RequestRequestIdMiddleware,      // 1. Request & Correlation IDs
    RequestRequestLogMiddleware,     // 2. Request log (userAgent / ipAddress / geoLocation)
    RequestHelmetMiddleware,         // 3. Security headers
    RequestBodyParserMiddleware,     // 4. Body parsing
    RequestCorsMiddleware,           // 5. CORS handling
    RequestUrlVersionMiddleware,     // 6. API version extraction
    RequestResponseTimeMiddleware,   // 7. Response time tracking
    RequestCustomLanguageMiddleware, // 8. Language detection
    RequestCompressionMiddleware     // 9. Response compression
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
- [Request Store](#request-store)
- [Decorators](#decorators)
  - [@RequestTimeout](#requesttimeout)
  - [@RequestEnvProtected](#requestenvprotected)


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

Manages cross-origin resource sharing (CORS) with flexible origin matching, credential handling, and security controls.

**Implementation:** `RequestCorsMiddleware`

**Features:**
- **Protocol-agnostic matching** — Accepts both `http` and `https` origins
- **Dynamic origin validation** — Supports exact hostname matching, wildcard subdomains, and specific ports
- **Automatic credential handling** — Credentials allowed only when using specific origins (not wildcard)
- **Configurable methods and headers** — Define allowed HTTP methods and request/response headers
- **Preflight request support** — Handles OPTIONS requests with proper cache control (max-age: 86400s)
- **Flexible configuration** — Accept single string, array of origins, boolean (true=allow all, false=deny all), or wildcard `*`

**Origin Matching Rules:**

1. **Exact Match** — Hostname and port must match exactly
   ```bash
   Pattern: example.com
   Allowed: http://example.com, https://example.com
   Denied: http://sub.example.com, http://example.com:3000
   ```

2. **With Explicit Port** — Port must match exactly
   ```bash
   Pattern: api.example.com:3000
   Allowed: http://api.example.com:3000, https://api.example.com:3000
   Denied: http://api.example.com (default port), http://api.example.com:8080
   ```

3. **Wildcard Subdomain** — Matches any subdomain (including base domain)
   ```bash
   Pattern: *.example.com
   Allowed: http://api.example.com, https://app.example.com, http://example.com
   Denied: http://api.myexample.com, http://example.org
   ```

4. **Universal Match** — Allow all origins
   ```bash
   Pattern: *
   Allowed: Any origin
   Credentials: Not allowed (CORS restriction)
   ```

**Credentials Handling:**
- When `allowedOrigin` is wildcard (`*`), credentials are **not allowed** (CORS security restriction)
- When using specific origins, credentials are **automatically allowed**
- This is configured via `credentials: true|false` in CORS options

**Configuration:** See [Configuration][ref-doc-configuration]

## Environment Protection

Restricts endpoint access based on environment.

**Implementation:** `RequestEnvGuard`

**Usage:**
```typescript
@RequestEnvProtected(EnumAppEnvironment.development)
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
}
```

`id` and `correlationId` are dual-written: they stay on `req` (read by filters, interceptors, and pino `genReqId`) and are also written to the request store under `RequestIdStoreKey` / `RequestCorrelationIdStoreKey` for ambient deep access. See [Request Store](#request-store).

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

**Storage:** the resolved version is written to the request store under `RequestVersionStoreKey` (not on `req`). Response interceptors and exception filters read it from the store, falling back to config `app.urlVersion.version`. See [Request Store](#request-store).

**Configuration:** See [Configuration][ref-doc-configuration]

## Custom Language

Processes `x-custom-lang` header for internationalization.

**Implementation:** `RequestCustomLanguageMiddleware`

**Usage:**
```bash
# Request header
x-custom-lang: id
```

**Storage:** the validated language is written to the request store under `RequestLanguageStoreKey` (not on `req`); the `x-custom-lang` request header is also synced to the resolved value. Response interceptors and exception filters read it from the store, falling back to config `message.language`. See [Request Store](#request-store).

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

## Request Store

Per-request ambient metadata is carried in the generic `RequestStoreService` (`src/common/request`), backed by `nestjs-cls` (AsyncLocalStorage). Services, interceptors, and filters read it via `get<T>(key)`. Repositories never read the store; a service reads the request log and threads it to its repository as the last method parameter (`requestLog: IRequestLog`).

**Keys (`request.constant.ts`):**

| Key | Written by | Holds |
|---|---|---|
| `RequestLogStoreKey` | `RequestRequestLogMiddleware` (`RequestUtil.buildRequestLog(req)`) | `IRequestLog` (`userAgent` / `ipAddress` / `geoLocation`), computed once per request |
| `RequestLanguageStoreKey` | `RequestCustomLanguageMiddleware` | resolved language code |
| `RequestVersionStoreKey` | `RequestUrlVersionMiddleware` | resolved API version |
| `RequestIdStoreKey` | `RequestRequestIdMiddleware` | `req.id` (dual-write) |
| `RequestCorrelationIdStoreKey` | `RequestRequestIdMiddleware` | `req.correlationId` (dual-write) |

**Request log (`RequestLogStoreKey`):** `userAgent`, `ipAddress`, and `geoLocation` are resolved once per request by the injectable `RequestUtil.buildRequestLog(req)` (`src/common/request/utils/request.util.ts`), called from `RequestRequestLogMiddleware`. `ActivityLogInterceptor` reads `get<IRequestLog>(RequestLogStoreKey)!` directly; audit services read the same key and pass the `IRequestLog` to their repository. Reads use a non-null assertion (no fallback object), since the middleware always populates the key before any handler runs. Nothing recomputes ua/ip/geo. The `@RequestIPAddress()` / `@RequestGeoLocation()` / `@RequestUserAgent()` param decorators still exist, but are now thin store-readers: each returns the matching field from `get<IRequestLog>(RequestLogStoreKey)?.<field> ?? null`.

`ClsModule.forRoot({ global: true, middleware: { mount: true } })` is registered in `RequestModule` (before `RequestMiddlewareModule`), so `ClsMiddleware` mounts the store before any request middleware writes to it. Each writer middleware sets only its own key.

**Queue boundary exception:** the new-device-login BullMQ job carries `requestLog` explicitly on its payload (`INotificationNewDeviceLoginPayload.requestLog`), snapshotted at enqueue time. Workers run in a separate process with no CLS store, so the value must cross the boundary as data.

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
@RequestEnvProtected(EnumAppEnvironment.development)
@Get('/admin/clear-cache')
async clearCache() {}
```

> Client IP, geolocation, and user-agent are exposed via the `@RequestIPAddress()` / `@RequestGeoLocation()` / `@RequestUserAgent()` param decorators, which now just read the value resolved once per request into the request store under `RequestLogStoreKey`. See [Request Store](#request-store).


<!-- REFERENCES -->

[ref-helmet]: https://helmetjs.github.io
[ref-throttler]: https://github.com/nestjs/throttler
[ref-compression]: https://www.npmjs.com/package/compression
[ref-response-time]: https://www.npmjs.com/package/response-time
[ref-ms]: https://github.com/vercel/ms

[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
