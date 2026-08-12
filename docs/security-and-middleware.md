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
    RequestWorkspaceMiddleware,      // 9. Active workspace header
    RequestCompressionMiddleware     // 10. Response compression
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
- [Trusted Proxy and Client IP](#trusted-proxy-and-client-ip)
- [Rate Limiting](#rate-limiting)
- [CORS](#cors)
- [Environment Protection](#environment-protection)
- [Request & Correlation IDs](#request--correlation-ids)
- [Body Parser](#body-parser)
- [URL Versioning](#url-versioning)
- [Custom Language](#custom-language)
- [Active Workspace](#active-workspace)
- [Response Compression](#response-compression)
- [Response Time](#response-time)
- [Request Timeout](#request-timeout)
- [Request Store](#request-store)
- [Decorators](#decorators)
  - [@RequestTimeout](#requesttimeout)
  - [@RequestEnvProtected](#requestenvprotected)
  - [@RequestThrottle](#requestthrottle)


## Authentication & Authorization

ACK NestJS Boilerplate includes comprehensive authentication and authorization systems. See dedicated documentation:

- [Authentication][ref-doc-authentication] - JWT, OAuth, API Keys, sessions, password management
- [Authorization][ref-doc-authorization] - RBAC, policy abilities, user protection

## Helmet

Applies protective HTTP headers using [Helmet][ref-helmet].

**Implementation:** `RequestHelmetMiddleware`

**Usage:** Automatically applied to all routes.

## Trusted Proxy and Client IP

Express `trust proxy` is set once at boot in `src/main.ts` from `app.http.trustedProxy`, which reads the optional `HTTP_TRUSTED_PROXY` environment variable.

```typescript
app.getHttpAdapter().getInstance<Express>().set('trust proxy', trustedProxy);
```

The value is a **trusted-network list**: `proxy-addr` preset names (`loopback`, `linklocal`, `uniquelocal`) or explicit CIDRs, comma-separated. It is never a hop count and never `true`.

- **Unset or empty** resolves to `null`, which trusts no proxy. `req.ip` is then the direct socket peer and no client can forge it through `X-Forwarded-For`.
- **A deployment behind a CDN or edge proxy that connects from a public address MUST list that provider's CIDRs.** Without them the proxy stays untrusted, `req.ip` is the proxy's own address, and every client behind it collapses into a single rate-limit bucket.

Only `req.ip` is consulted. `req.ips` is not read anywhere in the codebase.

> The request log (`ipAddress` under `RequestLogStoreKey`) is resolved separately by `RequestUtil.buildRequestLog(req)` through `@supercharge/request-ip`, which reads forwarding headers directly and is not governed by `trust proxy`. The two values can differ. See [Request Store](#request-store).

**Configuration:** See [Environment][ref-doc-environment]

## Rate Limiting

Prevents abuse using [Throttler][ref-throttler], backed by Redis so counters and blocks are shared across every instance.

**Three limiters run independently.** Each keeps its own counter, its own block, and its own response headers.

| Limiter | Keyed by | Applied | Limit | Block on breach |
|---|---|---|---|---|
| `default` | client IP | every route, always, no opt-in | 300 / 60s | 60s |
| `user` | authenticated `userId` | opt-in, `@RequestThrottle({ user: true })` | 100 / 60s | 60s |
| `route` | client IP, per handler | opt-in, `@RequestThrottle({ route: <tier> })` | per tier, below | 5m |

Route tiers are the members of `EnumRequestThrottleRoute`:

| Tier | Limit |
|---|---|
| `strict` | 5 / 60s |
| `moderate` | 20 / 60s |
| `relaxed` | 60 / 60s |

Every limit lives in `request.config.ts`. A decorator carries a switch or a tier name, never a number.

`default.limit` must stay above `user.limit` when retuning. The per-IP limiter is checked first on every request, so at or below the per-user limit a client on a single address always trips the IP bucket first and its per-user limit stops meaning anything.

**Default (per IP, global):** `RequestThrottlerGuard` is one of the two `APP_GUARD` providers registered by `RequestMiddlewareModule`, and enforces the single library throttler, explicitly named `default`. Its tracker is the client IP, and it applies to every route with no opt-in. The library's `@SkipThrottle()` is not used anywhere in this codebase and must not be introduced: the global limiter is the floor every endpoint sits on.

**Opt-in (`user` and `route`):** enforcement is split across two phases. `route` is enforced by `RequestThrottleRouteGuard`, the second `APP_GUARD` in the same module; `user` is enforced by `RequestThrottleInterceptor`, mounted by `@RequestThrottle`. Both read the decorator's metadata off the handler, and the `route` limiter is evaluated first because every global guard runs before every interceptor, so a request rejected by the endpoint limit never touches the personal counter.

Being a global guard also puts the `route` limiter ahead of controller-level and route-level guards, which run later. A route tier therefore rejects before `@ApiKeyProtected()`, `@FeatureFlagProtected()`, and the social-login guards do any work: `POST /login/social/google` and `/login/social/apple` carry the `strict` tier, so the limiter gates the outbound provider verification instead of following it.

Both opt-in limiters run through `RequestThrottleUtil.evaluate()` (`src/common/request/utils/request.throttle.util.ts`), the single place that counts the hit, fails open, sets `Retry-After`, raises `ThrottlerException`, and writes the `X-RateLimit-*` trio. Their responses are therefore identical in shape.

Every handler carrying `@AuthJwtAccessProtected()` or `@AuthJwtRefreshProtected()` also carries `@RequestThrottle({ user: true })`. `user: true` on a request with no authenticated user is a silent no-op, so the `public` and `system` scopes, which never populate `req.user`, deliberately omit the switch. A JWT-protected handler that omits it keeps only the global per-IP limit, and nothing fails or logs to say so.

```typescript
@AuthJwtAccessProtected()
@RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
@Post('/password/change')
async endpoint() {}
```

Decorator order is irrelevant. `@RequestThrottle` writes metadata and mounts an interceptor; the metadata is read by a global guard for the `route` tier, and the interceptor runs after every guard for the `user` switch, so the `user` limiter always sees the verified `req.user` wherever the decorator sits in the stack.

**Tracker resolution:** both guards take `req.ip`, validate it with `net.isIP()`, and fall back to `req.socket.remoteAddress` when it is not an address (`RequestUtil.resolveThrottleTrackerIp`). A non-address `X-Forwarded-For` token therefore cannot become a Redis key segment. See [Trusted Proxy and Client IP](#trusted-proxy-and-client-ip). The `user` limiter never reads the client address.

The `route` tracker is a composite rather than a bare IP: `{tier}:{ControllerClass}.{handlerName}:{ip}`. The `user` tracker is the bare `userId`.

**Storage:** `RequestThrottlerStorageService` (`implements ThrottlerStorage`) is the store for all three limiters. It runs a single Lua script per check in one round-trip against the **shared cache Redis connection** through `RedisClientCachedProvider`. It does not open a second connection. Cache lives on Redis `db:0`, and the throttler reuses that same connection.

The algorithm is an **exact sliding window log**, not a fixed window. Each allowed request is appended to a sorted set scored by the Redis clock (`redis.call('TIME')`, never the Node clock), and entries older than the window are trimmed on every check. A rejected request is NOT recorded, so a client hammering a blocked endpoint cannot push its own window forward. When the limit is breached the script sets the block key for `blockDurationInMs`; while that key exists every further request short-circuits with the block's remaining time and no counting happens.

Durations are converted to **seconds** at the service boundary, so every field of the returned record is in seconds.

**Registration:** the storage service is provided by `RequestThrottlerModule` and injected into `ThrottlerModule.forRootAsync`:
```typescript
ThrottlerModule.forRootAsync({
  imports: [ConfigModule, RequestThrottlerModule],
  inject: [ConfigService, RequestThrottlerStorageService],
  useFactory: (config, storage) => ({
    throttlers: [{
      name: 'default',
      ttl: config.get<number>('request.throttle.default.ttlInMs'),
      limit: config.get<number>('request.throttle.default.limit'),
      blockDuration: config.get<number>('request.throttle.default.blockDurationInMs'),
    }],
    storage,
  }),
})
```

**Redis keys** follow the configured patterns, with `{name}` one of `default` / `user` / `route` and `{tracker}` the value described above:
```
Request:Throttler:{name}:{tracker}         # sliding window log (sorted set)
Request:Throttler:Block:{name}:{tracker}   # active block
Request:Throttler:Seq:{name}:{tracker}     # sequence counter, makes log members unique
```

**Response headers.** The `default` limiter emits the unsuffixed trio; the `route` guard emits the `-route` suffixed trio and the `user` interceptor the `-user` one. `Retry-After` is unsuffixed on every path and is expressed in **seconds**.

| Header | Written when |
|---|---|
| `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` | every request that passes the global limiter |
| `X-RateLimit-Limit-route`, `X-RateLimit-Remaining-route`, `X-RateLimit-Reset-route` | the handler carries a `route` tier and passes it |
| `X-RateLimit-Limit-user`, `X-RateLimit-Remaining-user`, `X-RateLimit-Reset-user` | the handler carries `user: true`, the request is authenticated, and it passes |
| `Retry-After` | any limiter blocks the request (the 429 response) |

All ten are listed in `request.cors.exposedHeader` and emitted as `Access-Control-Expose-Headers`, so a browser client can read them cross-origin. See [CORS](#cors).

**Breach response:** the blocking limiter throws `ThrottlerException`, a framework `HttpException`, so `AppHttpFilter` builds the envelope. See [Handling Error][ref-doc-handling-error].

**Fail-open (uniform):** any Redis trouble (connection failure, a malformed or non-array reply, a non-numeric value, or any caught error) is logged and the request is ALLOWED. Throttling never returns a 500. While Redis is unreachable there is no rate limiting at all: availability wins over enforcement.

**Configuration:** See [Configuration][ref-doc-configuration]

## CORS

Manages cross-origin resource sharing (CORS) with flexible origin matching, credential handling, and security controls.

**Implementation:** `RequestCorsMiddleware`

**Features:**
- **Protocol-agnostic matching** — Accepts both `http` and `https` origins
- **Dynamic origin validation** — Supports exact hostname matching, wildcard subdomains, and specific ports
- **Automatic credential handling** — Credentials allowed only when using specific origins (not wildcard)
- **Configurable methods and headers** — Define allowed HTTP methods and accepted request headers
- **Exposed response headers** — `request.cors.exposedHeader` is emitted as `Access-Control-Expose-Headers`; it carries `Retry-After` and all nine `X-RateLimit-*` variants, so a browser client can read its rate-limit state cross-origin. See [Rate Limiting](#rate-limiting)
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

## Active Workspace

Processes the `x-workspace-id` header for workspace scoping.

**Implementation:** `RequestWorkspaceMiddleware`

**Usage:**
```bash
# Request header
x-workspace-id: 6650f0c5a1b2c3d4e5f60718
```

**Storage:** the raw header value is written to the request store under the key configured by `workspace.storeKey` (`workspaceId`), or `null` when the header is absent or not a string. The middleware never validates the id; `WorkspaceGuard` resolves and validates it later.

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

**Global Registration:** provided as an `APP_INTERCEPTOR` by `RequestModule.forRoot()`, alongside `RequestActorInterceptor` and the global `ValidationPipe`.
```typescript
{
  provide: APP_INTERCEPTOR,
  useClass: RequestTimeoutInterceptor,
}
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
| `RequestActorStoreKey` | `RequestActorInterceptor` | `req.user.userId`, set only when the request is authenticated |

Two further store keys are written outside `request.constant.ts`: `RequestWorkspaceMiddleware` writes the raw `x-workspace-id` header under the key configured by `workspace.storeKey`, and `WorkspaceGuard` writes the resolved workspace under `WorkspaceStoreKey` (`src/modules/workspace/constants/workspace.constant.ts`).

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

### @RequestThrottle

Switches on the opt-in `user` and `route` limiters for one endpoint, on top of the always-on global per-IP limiter.

**Signature:**
```typescript
RequestThrottle(options: IRequestThrottleOptions): MethodDecorator

interface IRequestThrottleOptions {
  user?: boolean;
  route?: EnumRequestThrottleRoute;
}
```

**Example:**
```typescript
@AuthJwtAccessProtected()
@RequestThrottle({ user: true })
@Get('/me')
async endpoint() {}
```

- **Method decorator only.** The return type is `MethodDecorator`, so placing it above a `@Controller` class is a TypeScript error, not a convention. Both readers take the metadata off `context.getHandler()` alone, so class-level options would be invisible even if the typing allowed them.
- **One call per handler.** A route needing both switches writes them in the same call: `@RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })`. Two separate calls on one handler make the second `SetMetadata` overwrite the first and silently drop a switch.
- **Position is free.** The `route` tier is read by a global guard and the `user` switch by an interceptor that runs after every guard, so neither depends on where the decorator sits.

See [Rate Limiting](#rate-limiting).

> Client IP, geolocation, and user-agent are exposed via the `@RequestIPAddress()` / `@RequestGeoLocation()` / `@RequestUserAgent()` param decorators, which read the value resolved once per request into the request store under `RequestLogStoreKey`. See [Request Store](#request-store).


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
[ref-doc-handling-error]: handling-error.md
