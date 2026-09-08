# Cache Documentation

This documentation explains the features and usage of:
- **Cache Module**: Located at `src/common/cache`
- **Redis Module**: Located at `src/common/redis`

## Overview

This application uses **Redis** as the cache storage backend to improve performance and reduce database load. The cache is implemented using a global module pattern, making it accessible throughout the application without repeated imports.

This application uses **cache-manager v7**, which uses **Keyv** as the unified storage interface. We use `@keyv/redis` as the Redis adapter.

## Related Documents

- [Configuration Documentation][ref-doc-configuration] - For Redis configuration settings
- [Environment Documentation][ref-doc-environment] - For Redis environment variables
- [Authentication Documentation][ref-doc-authentication] - For session cache usage examples
- [Response Documentation][ref-doc-response] - For response caching implementation

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Principles & Patterns](#principles--patterns)
  - [DRY & Singleton Pattern](#dry--singleton-pattern)
  - [Global Module Pattern](#global-module-pattern)
- [Architecture](#architecture)
  - [Module Dependency Flow](#module-dependency-flow)
  - [RedisCacheModule](#rediscachemodule)
  - [CacheMainModule](#cachemainmodule)
  - [SessionModule](#sessionmodule)
- [Configuration](#configuration)
  - [Redis Configuration](#redis-configuration)
  - [Module Import Order](#module-import-order)
- [Usage](#usage)
  - [Injecting Cache Providers](#injecting-cache-providers)
  - [Cache Operations](#cache-operations)


## Principles & Patterns

### DRY & Singleton Pattern

- **Single Cache Connection**: Only ONE Redis connection is created for caching and shared across every cache consumer. BullMQ opens its own connections against `QUEUE_REDIS_URL` and does not reuse this client
- **Single Configuration**: Defined once in `redis.config.ts`
- **Reusable Providers**: `CacheMainProvider` and `SessionCacheProvider` share the same Redis client
- **Direct client consumer**: `RequestThrottlerStorageService` injects `RedisClientCachedProvider` itself and runs its sliding-window Lua script on that same connection, so rate limiting adds no Redis connection of its own. See [Security and Middleware Documentation][ref-doc-security-and-middleware]

**Example:**

```
❌ Without DRY:
UserService → Creates Redis connection 1
ProductService → Creates Redis connection 2
OrderService → Creates Redis connection 3

✅ With DRY:
RedisCacheModule → Creates ONE Redis connection
All services → Inject and reuse the same connection
```

### Global Module Pattern

`RedisCacheModule` and `CacheMainModule` are dynamic modules whose `forRoot()` returns `global: true`, and `SessionModule` carries the `@Global()` decorator:
- Providers automatically available everywhere
- No need to import in feature modules

## Architecture

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
    └── SessionModule (Global)
        └── Uses: RedisClientCachedProvider
        └── Provides: SessionCacheProvider, SessionService, SessionCacheService, SessionUtil
```

### RedisCacheModule

**Purpose:** Provides Redis client instance

**Provider:** `RedisClientCachedProvider`

**Scope:** Global (available everywhere)

**Configuration:**
```typescript
createKeyv(
    { url: 'redis://localhost:6379/0' }, // from CACHE_REDIS_URL
    {
        connectionTimeout: 30000,
        namespace: 'Cache',
        useUnlink: true,
        keyPrefixSeparator: ':'
    }
)
```

### CacheMainModule

**Purpose:** Provides cache manager for application-wide caching

**Provider:** `CacheMainProvider`

**Scope:** Global (available everywhere)

**Depends on:** `RedisClientCachedProvider`

**Usage:**
```typescript
export class FeatureFlagCacheService {
    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
    ) {}
}
```

A cache manager is injected into a dedicated cache service, an interceptor, or a health indicator. The current consumers of `CacheMainProvider` are `ApiKeyCacheService`, `AuthCacheService`, `FeatureFlagCacheService`, `HealthRedisIndicator`, and `ResponseCacheInterceptor`.

### SessionModule

**Purpose:** Provides cache for session management only

**Provider:** `SessionCacheProvider` (`src/modules/session/constants/session.constant.ts`)

**Scope:** Global (available everywhere)

**Depends on:** `RedisClientCachedProvider` (shares same Redis connection)

**Usage:**
```typescript
export class SessionCacheService {
    constructor(
        @Inject(SessionCacheProvider) private cacheManager: Cache,
    ) {}
}
```

`SessionCacheService` is the only injection site. `SessionCacheProvider` is registered inside `SessionModule` and stays internal to it: the module imports `SessionRepositoryModule`, provides `SessionService`, `SessionCacheService` and `SessionUtil`, and exports `SessionService` and `SessionCacheService`.

Both cache modules register their own `CacheManagerModule.registerAsync` over the shared `RedisClientCachedProvider` with `ttl` from `redis.cache.ttlInMs`, then alias `CACHE_MANAGER` to their named provider with `useExisting`.

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

**Redis database:** The cache uses database `0` (`CACHE_REDIS_URL=redis://localhost:6379/0`). BullMQ uses database `1` (`QUEUE_REDIS_URL=redis://localhost:6379/1`) on the same server, so flushing one does not touch the other.

**Key prefix:** `namespace: 'Cache'` with `keyPrefixSeparator: ':'` means every key is stored as `Cache:{key}`.

### Module Import Order

**File:** `src/common/common.module.ts`

```typescript
@Module({
    imports: [
        ConfigModule.forRoot(),
        RedisCacheModule.forRoot(),    // Redis connection first
        QueueRegisterModule.forRoot(), // BullMQ, own connections on QUEUE_REDIS_URL
        CacheMainModule.forRoot(),     // Depends on RedisCacheModule
        // ... DatabaseModule, RequestModule, and other globals ...
        SessionModule,                 // Feature modules later (registers SessionCacheProvider)
    ]
})
export class CommonModule {}
```

**Why this order?** `CacheMainModule` depends on `RedisClientCachedProvider` from `RedisCacheModule`. `SessionModule` registers its own cache provider over the same client later.

## Usage

### Injecting Cache Providers

**Global cache:**
```typescript
@Injectable()
export class FeatureFlagCacheService {
    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
    ) {}
}
```

**Session cache:**
```typescript
@Injectable()
export class SessionCacheService {
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
