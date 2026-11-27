---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/request/services/request.throttle-storage.service.ts'
---

# Cache

- MongoDB is the source of truth; Redis `db:0` holds caches, their lease keys included, and throttle counters, nothing else. A cache is a side resource: every entry has a TTL and is never an invariant. A short-lived or one-time value that gates a flow (a one-time code, a verification or reset token, the login challenge, the social nonce) is a database row, deleted or marked on use, and no value is written to both stores.
- `RedisModule.forRoot()` (`src/common/redis/redis.module.ts`) owns every Redis client, all ioredis: the cache client (`RedisCacheClient`), the queue producer (`RedisQueueClient`), and the queue worker (`RedisQueueWorkerClient`, `queue.md`), all three exported. `RedisClientFactory` (`src/common/redis/factories/redis.client.factory.ts`) builds the three clients (`createCache`, `createQueue`, `createQueueWorker`) with `lazyConnect`, attaches each client's listeners (one `warn` per `error` event, one `log` per `ready` event), and awaits `connect()`, so the app does not boot while Redis is down; on shutdown it runs `quit()` on a ready client, else `disconnect()`. Every BullMQ `Worker` and `Queue` carries an `error` listener (`QueueProcessorBase.onError`, the `QueueBase` and `HealthQueueIndicator` constructors) that warns on every error, a connection error included.
- The cache client, on `redis.cache.url`: `enableOfflineQueue: false`, the command timeout `redis.commandTimeoutInMs`, the connect timeout `redis.connectTimeoutInMs`, `keyPrefix` `Cache:` from `redis.cache.namespace`, which prefixes every key, Lua `KEYS` included; code passes unprefixed keys.
- `CacheModule.forRoot()` provides `CacheService` (`src/common/cache/services/cache.service.ts`) over that client. `readThrough` is the one method taking a loader.
- Redis is required: every error a Redis command raises in `CacheService` or `RequestThrottleStorageService` throws `RedisUnavailableException` (503, `src/common/redis/exceptions/redis.unavailable.exception.ts`) carrying it, with no classifier. The throttle storage's invalid replies (not an array, a non-numeric value) log one `warn` and fail open.
- `readThrough(key, schema, ttlInMs, loader, options?)`: every value is plain JSON written with `PX`; a value passing `JSON.parse` and `schema.safeParse` is the hit; a missing entry, or one failing either (one `warn`, its key unlinked), runs `loader()` and sets its result. A `null` result is not stored. The schema revives what JSON drops (`z.coerce.date()`).
- `options.lease`, for a shared hot key (`ApiKeyCache`, `FeatureFlagCache`), holds no stale entry past a delete: the invalidate job removes the entry and its lease.
- A write that changes or deletes a cached row invalidates through an effect: `effects.md`, Cache invalidation.
- `CacheService.flush` runs `flushdb` on the cache client; `MigrationSeedBase` is its one caller.
- `CacheModule.forRoot()` registers the `cache` queue with `CacheQueueFactory`, reading the `cache` config's `queue` object, and provides and exports its queue class, `CacheQueue` (`src/common/cache/queues/cache.queue.ts`), also under `EnumCacheQueue.cache`; `CacheProcessor` (`src/common/cache/processors/`), awaits `CacheService.invalidate(data.keys)`, and the processor base rethrows a `RedisUnavailableException` as an `AppBaseException` for BullMQ to retry (`queue.md`, Processors); its messages are `cache.queue.*` in `src/languages/<lang>/cache.json`.
- The session login entry and its purge: `session.md`, Session invalidation.

## Class shape

Every `caches/*.cache.ts` has one shape:

- Constructor: `ConfigService`, then the helpers it uses.
- Fields: one `private readonly` key pattern field and one `readonly` TTL field per key or per group of keys sharing a TTL (`AnalyticCache.dashboardTtlInMs`), a lease adding its lease key pattern and lease TTL fields, read from config in the constructor and named by `injectable.md`, Config (`ApiKeyCache.cacheTtlInMs`); the TTL is public for the service's `readThrough`.
- Key building: one `build<Subject>Key(...)` per key, public when a service reads through it, filled as `code-style.md`, Composed strings, gives. A leased cache adds `build<Subject>Lease(...)`, the `ICacheLease` for `readThrough`, and `build<Subject>Keys(...)`, public, the entry and lease keys the service passes to `invalidateEffect`.
- Schema: `<Subject>CacheSchema` in its own file in the module's `dtos/` (`api-key.cache.dto.ts`, `dto.md`), any zod schema declared `satisfies z.ZodType<T>` (`z.object({...})`, `z.array(...)`); a cache serving several shapes has one per shape (`Analytic<Shape>CacheSchema`).
- Methods: a read-through cache holds key builders only: no read or delete method, no loader, no try/catch, no logger, and no Lua script. `<Subject>` is the entry's full name, one word across the key builder and every method, and it keeps a segment the class name carries: `ApiKeyCache` has `buildApiKeyKey`, `buildApiKeyLease`, `buildApiKeyKeys`, never `buildKey`.
- A cache injects no repository: the service calls `CacheService.readThrough` with the cache's key, TTL, and lease, the schema constant, and the loader, a concise arrow: a repository read (`FeatureFlagService.getByKey`, `src/modules/feature-flag/services/feature-flag.service.ts`), or one private method of the service that shapes what it caches (`() => this.loadUserChurn(range)`).
