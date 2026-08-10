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

`RedisCacheModule` and `CacheMainModule` are marked as `@Global()`:
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
        └── Provides: SessionCacheProvider
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
export class FeatureFlagUtil {
    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
    ) {}
}
```

Cache is injected into utils, interceptors, and health indicators, not into services. The current consumers are `ApiKeyUtil`, `AuthTwoFactorUtil`, `FeatureFlagUtil`, `HealthRedisIndicator`, and `ResponseCacheInterceptor`.

### SessionModule

**Purpose:** Provides cache for session management only

**Provider:** `SessionCacheProvider`

**Scope:** Global (available everywhere)

**Depends on:** `RedisClientCachedProvider` (shares same Redis connection)

**Usage:**
```typescript
export class SessionUtil {
    constructor(
        @Inject(SessionCacheProvider) private cacheManager: Cache,
    ) {}
}
```

`SessionUtil` is the only injection site.

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
        SessionModule,                 // Feature modules later (SessionUtil injects SessionCacheProvider)
    ]
})
export class CommonModule {}
```

**Why this order?** `CacheMainModule` depends on `RedisClientCachedProvider` from `RedisCacheModule`. `SessionModule` registers its own cache provider later.

## Usage

### Injecting Cache Providers

**Global cache:**
```typescript
@Injectable()
export class FeatureFlagUtil {
    constructor(
        @Inject(CacheMainProvider) private readonly cacheManager: Cache,
    ) {}
}
```

**Session cache:**
```typescript
@Injectable()
export class SessionUtil {
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
