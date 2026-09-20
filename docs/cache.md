# Cache Documentation

Cache lives in `src/common/cache`. The Redis client lives in `src/common/redis`.

## Overview

Redis is the cache backend. `RedisCacheModule` is global, so other modules do not import it again.

The stack is **cache-manager v7**, **Keyv** as the storage interface, and `@keyv/redis` as the Redis adapter.

## Related Documents

- [Configuration Documentation][ref-doc-configuration] - Redis config keys
- [Environment Documentation][ref-doc-environment] - `CACHE_REDIS_URL` / Compose vs ElastiCache
- [Authentication Documentation][ref-doc-authentication] - Session cache
- [Response Documentation][ref-doc-response] - Response caching
- [Installation Documentation][ref-doc-installation] - Local Redis via Docker Compose

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Architecture](#architecture)
  - [Module Dependency Flow](#module-dependency-flow)
  - [RedisCacheModule](#rediscachemodule)
  - [CacheMainModule](#cachemainmodule)
  - [SessionDomainModule](#sessiondomainmodule)
  - [Session Cache](#session-cache)
  - [Redis Failures](#redis-failures)
- [Configuration](#configuration)
  - [Redis Configuration](#redis-configuration)
  - [Module Import Order](#module-import-order)
- [Usage](#usage)
  - [Injecting Cache Providers](#injecting-cache-providers)
  - [Cache Operations](#cache-operations)


## Architecture

One Redis connection serves caching. `RedisCacheModule.forRoot()` and `CacheMainModule.forRoot()` are global; `SessionDomainModule` is `@Global()`. Feature modules do not re-import them. `CacheMainProvider` and `SessionCacheProvider` share that client. `RequestThrottleStorageService` injects `RedisClientCachedProvider` for its sliding-window Lua script, so rate limiting adds no extra connection. See [Security and Middleware][ref-doc-security-and-middleware]. BullMQ uses `QUEUE_REDIS_URL` and does not reuse this client.

### Module Dependency Flow

```
CommonModule
    ├── RedisCacheModule (Global)
    │   └── Creates: RedisClientCachedProvider
    │
    ├── CacheMainModule (Global)
    │   └── Uses: RedisClientCachedProvider
    │   └── Provides: CacheMainProvider
    │
    └── SessionDomainModule (Global)
        └── Uses: RedisClientCachedProvider
        └── Provides: SessionCacheProvider, SessionDomain, SessionCache, SessionUtil, SessionAnalyticDomain
```

### RedisCacheModule

Provides `RedisClientCachedProvider` (global).

**Configuration:**
```typescript
createKeyv(
    { url: 'redis://localhost:6379/0' }, // from CACHE_REDIS_URL
    {
        connectionTimeout: 30000,
        namespace: 'Cache',
        useUnlink: true,
        keyPrefixSeparator: ':',
        throwOnErrors: true
    }
)
```

`throwOnErrors: true` makes a failed Redis command reject instead of resolving. What each caller does with that rejection: [Redis Failures](#redis-failures).

### CacheMainModule

Provides `CacheMainProvider` (global application cache). Depends on `RedisClientCachedProvider`.

**Usage:**
```typescript
export class FeatureFlagCache {
    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
    ) {}
}
```

A cache manager is injected into a dedicated cache class, an interceptor, or a health indicator. Current consumers of `CacheMainProvider`:

- `ApiKeyCache`
- `AuthCache`
- `FeatureFlagCache`
- `AnalyticCache`
- `HealthRedisIndicator`
- `ResponseCacheInterceptor`

**Building a key from its config pattern.** Every key pattern lives in config, and how it is filled follows the number of placeholders in it:

| Placeholders | Filled by | Patterns |
|---|---|---|
| one | `String.prototype.replace('{name}', () => value)` | `ApiKey:{key}`, `FeatureFlag:{key}`, `Apis:{key}`, `TwoFactor:Challenge:{token}`, `TwoFactor:Lock:{userId}` |
| two or more | `HelperStringService.fillPattern(pattern, values)` | `User:{userId}:Session:{sessionId}`, the four `Analytic:*` patterns, the throttle storage patterns |

The function form of `replace` stops a value containing `$&` or `$1` from being read as a replacement pattern. `fillPattern` scans `{token}` once and substitutes from the value map, so a substituted value is never re-read as a token, and a token with no entry raises `HelperPatternTokenMissingException` (`52202`, 500).

### SessionDomainModule

Registers `SessionCacheProvider` (session keys only) on the same Redis client. Global via `@Global()`.

**Usage:**
```typescript
export class SessionCache {
    constructor(
        @Inject(SessionCacheProvider) private cacheManager: Cache,
    ) {}
}
```

`SessionCache` is the only injection site of `SessionCacheProvider`. `SessionCache` also injects `RedisClientCachedProvider` for the two operations the cache manager cannot express (see [Session Cache](#session-cache)).

`SessionCacheProvider` is registered inside `SessionDomainModule` and stays internal to it. The module:

- imports `SessionRepositoryModule`
- provides `SessionDomain`, `SessionCache`, `SessionUtil`, and `SessionAnalyticDomain`
- exports `SessionDomain`, `SessionCache`, and `SessionAnalyticDomain`

Both cache modules register their own `CacheManagerModule.registerAsync` over the shared `RedisClientCachedProvider` with `ttl` from `redis.cache.ttlInMs`, then alias `CACHE_MANAGER` to their named provider with `useExisting`.

### Session Cache

`SessionCache` (`src/modules/session/caches/session.cache.ts`) stores one entry per login under the `session.keyPattern` key (`User:{userId}:Session:{sessionId}`). `HelperStringService.fillPattern` fills both placeholders in a single pass, and a placeholder the call supplies no value for raises `HelperPatternTokenMissingException` (`52202`, 500) rather than leaving the literal `{token}` in a Redis key.

| Method | What it does |
|---|---|
| `getLogin(userId, sessionId)` | Reads the entry through the cache manager; `null` on a miss |
| `setLogin(userId, sessionId, jti, expiredAt)` | Writes the entry through the cache manager, with a TTL running to `expiredAt` |
| `updateLogin(userId, sessionId, session, jti, expiredInMs)` | Rewrites the entry with the new `jti` and TTL as `SET … PX … XX` on the shared client, so it writes only while the entry still exists. It serializes the value with Keyv and prefixes the key with the store namespace, so the stored shape matches what `setLogin` writes. Returns whether it wrote |
| `deleteLogins(userId, sessions)` | Deletes exactly the given session entries through `mdel`; nothing when the list is empty |
| `deleteLoginsByUser(userId)` | Walks every master node with `SCAN` (`MATCH` on the user's key prefix, `COUNT` `SessionCachePurgeScanCount` = 1000, `TYPE string`) and `UNLINK`s each batch it finds |

`SessionDomain` wraps the two deletes:

| Wrapper | Calls | Serves |
|---|---|---|
| `purgeRevokedLogins` | `deleteLogins` | Paths that revoke one session or a subset: logout, a single self or admin revoke, device removal, and the sessions a login revokes on a known device |
| `purgeLoginsByUser` | `deleteLoginsByUser` | Paths that revoke every session of a user: account self-deletion, admin revoke-all, an admin status change to `blocked` or `inactive`, password change, forgot-password reset, admin password reset, two-factor disable, and admin two-factor reset |

Both run after the revoke has committed, and both log and swallow a failure, so the committed revoke still answers success. Each path then stages its activity rows. Flow narrative: [Authentication][ref-doc-authentication].

A refresh rotates the entry with `updateLogin` after its database commit. When the entry is gone (a revoke purged it while the refresh ran), nothing is written and the refresh answers `AuthJwtRefreshTokenInvalidException` (401, `50801`).

### Redis Failures

Reads through the cache manager (`get`, `ttl`) resolve to a miss when Redis fails, so a read falls through to the database or to the caller's miss handling. Writes and deletes split into three groups:

| Group | Calls | On a Redis failure |
|---|---|---|
| Propagate | `SessionCache.setLogin` (every login), `SessionCache.updateLogin` (refresh), `AuthCache.createChallenge` (login with two-factor), `ApiKeyCache.deleteCacheByKey` (API key admin writes, `MigrationApiKeySeed.remove`) | The request answers 500 |
| Caught in the cache class and logged | `AuthCache.clearChallenge`, `AuthCache.lockTwoFactorAttempt`, `AuthCache.clearLockTwoFactorAttempt`, `ApiKeyCache.setCacheByKey`, every `FeatureFlagCache` and `AnalyticCache` call | The request continues |
| Caught in `SessionDomain` and logged | `SessionCache.deleteLogins`, `SessionCache.deleteLoginsByUser` | The request continues |

`ResponseCacheInterceptor` inherits the error handling of `@nestjs/cache-manager`'s `CacheInterceptor`, which logs a failed write and runs the handler when the cache lookup fails.

An API key admin write that changes or deletes a key runs, in order:

1. database write
2. stages its activity row with `onError: true`
3. deletes the key's cache entry

Writes covered: status, name, dates, reset, delete. When the delete fails, the request answers 500 with the database change applied and its activity row written. `MigrationApiKeySeed.remove` deletes the `ApiKey` rows first, then the cache entries of the seeded keys.

## Configuration

### Redis Configuration

**File:** `src/configs/redis.config.ts`

```typescript
{
    cache: {
        url: process.env.CACHE_REDIS_URL!,
        namespace: 'Cache',
        ttlInMs: ms('5m')  // Default TTL: 5 minutes
    }
}
```

**Default TTL:** Cache entries expire after **5 minutes** (300,000 milliseconds) by default. This can be overridden per cache operation.

**Redis database:** Cache uses `db:0` via `CACHE_REDIS_URL`; BullMQ uses `db:1` via `QUEUE_REDIS_URL`. Locally prefer Compose Redis; without Docker use a hosted Redis such as [Amazon ElastiCache][ref-elasticache]. See [Environment][ref-doc-environment] and [Installation][ref-doc-installation].

**Key prefix:** `namespace: 'Cache'` with `keyPrefixSeparator: ':'` means every key is stored as `Cache:{key}`.

### Module Import Order

**File:** `src/common/common.module.ts`

```typescript
@Module({
    imports: [
        ConfigModule.forRoot(),
        // ... MessageModule, LoggerModule, SentryModule ...
        RedisCacheModule.forRoot(),    // Redis connection first
        QueueModule.forRoot(), // BullMQ, own connections on QUEUE_REDIS_URL
        CacheMainModule.forRoot(),     // Depends on RedisCacheModule
        // ... DatabaseModule, RequestModule, and other globals ...
        SessionDomainModule,                 // Feature modules later (registers SessionCacheProvider)
    ]
})
export class CommonModule {}
```

`CacheMainModule` needs `RedisClientCachedProvider` from `RedisCacheModule`. `SessionDomainModule` registers its session cache provider on the same client later.

## Usage

### Injecting Cache Providers

**Global cache:**
```typescript
@Injectable()
export class FeatureFlagCache {
    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
    ) {}
}
```

**Session cache:**
```typescript
@Injectable()
export class SessionCache {
    constructor(
        @Inject(SessionCacheProvider) private cacheManager: Cache,
    ) {}
}
```

### Cache Operations

For cache operations (set, get, delete, etc.), see:
- [NestJS Caching][ref-nestjs-caching]
- [cache-manager][ref-cache-manager]


<!-- REFERENCES -->

[ref-nestjs-caching]: https://docs.nestjs.com/techniques/caching
[ref-cache-manager]: https://www.npmjs.com/package/cache-manager

[ref-doc-configuration]: configuration.md
[ref-doc-environment]: environment.md
[ref-doc-authentication]: authentication.md
[ref-doc-response]: response.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-installation]: installation.md
[ref-elasticache]: https://aws.amazon.com/elasticache/
