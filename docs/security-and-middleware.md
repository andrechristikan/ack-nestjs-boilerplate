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
  - [@RequestGeoLocation](#requestgeolocation)
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

### @RequestGeoLocation

Extracts geolocation information from the client's IP address using `geoip-lite`.

**Signature:**
```typescript
RequestGeoLocation(): ParameterDecorator
```

**Example:**
```typescript
@Get('/geo-info')
async getGeoInfo(@RequestGeoLocation() geoLocation: GeoLocation | null) {
  return { geoLocation };
}
```

**Return Type:** `GeoLocation | null` — returns `null` when IP cannot be resolved or geolocation data is unavailable.

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

[ref-helmet]: https://helmetjs.github.io
[ref-throttler]: https://github.com/nestjs/throttler
[ref-compression]: https://www.npmjs.com/package/compression
[ref-response-time]: https://www.npmjs.com/package/response-time
[ref-ms]: https://github.com/vercel/ms
[ref-nestjs-real-ip]: https://github.com/p0vidl0/nestjs-real-ip
[ref-ua-parser-js]: https://github.com/faisalman/ua-parser-js

[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
