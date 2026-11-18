---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/request/services/request.throttle-storage.service.ts'
---

# Cache

- MongoDB is the authority; Redis `db:0` holds caches, their lease keys included, and throttle counters, nothing else. A cache entry is never an invariant. A short-lived or one-time value that gates a flow (a one-time code, a verification or reset token, the login challenge, the social nonce) is a database row, deleted or marked on use, and no value is written to both stores.
- `RedisModule.forRoot()` (`src/common/redis/redis.module.ts`) owns every Redis client, all ioredis: the cache client (`RedisCacheClient`), the queue producer (`RedisQueueClient`), and the queue worker (`RedisQueueWorkerClient`, `queue.md`), all three exported. `RedisClientFactory` (`src/common/redis/factories/redis.client.factory.ts`) builds the three clients (`createCache`, `createQueue`, `createQueueWorker`) with `lazyConnect`, attaches each client's `error` listener (one `warn` when the client leaves `ready`, one `log` when it is back), and awaits `connect()`, so the app does not boot while Redis is down; on shutdown it runs `quit()` on a ready client, else `disconnect()`. Every BullMQ `Worker` and `Queue` carries an `error` listener (`QueueProcessorBase.onError`, the `QueueBase` and `HealthQueueIndicator` constructors) that drops a connection error (`CacheService.isConnectionError`), which the factory already logs, and warns on any other.
- The cache client, on `redis.cache.url`: `enableOfflineQueue: false`, the command timeout `redis.commandTimeoutInMs`, the connect timeout `redis.connectTimeoutInMs`, `keyPrefix` `Cache:` from `redis.cache.namespace`, which prefixes every key, Lua `KEYS` included; code passes unprefixed keys.
- `CacheModule.forRoot()` provides `CacheService` (`src/common/cache/services/cache.service.ts`) over that client. `readThrough` is the one method taking a loader.
- A Redis error falls in one of two classes, decided by `CacheService.isConnectionError`:
    - a connection error, Redis not answering (an `Error` whose message is in `RedisConnectionErrorMessages`, whose `name` is in `RedisConnectionErrorNames`, or whose `code` is in `RedisConnectionErrorCodes`, `src/common/redis/constants/redis.constant.ts`), throws `RedisUnavailableException`: the request answers 503 fast;
    - any other error (an entry failing `JSON.parse` or its schema, a Lua or type error) is a miss: `warnOnce` logs it at `warn` once per key per `redis.warnWindowInMs`, and the read goes on to the database.
- `readThrough(key, schema, ttlInMs, loader, options?)`: every value is plain JSON written with `PX`; a value passing `JSON.parse` and `schema.safeParse` is the hit; a missing entry, a schema failure (the key is deleted), or a non-connection error runs `loader()` and sets its result, a set error classed as above. A `null` result is not stored. The schema revives what JSON drops (`z.coerce.date()`).
- `options.lease`, for a shared hot key (`ApiKeyCache`, `FeatureFlagCache`, `RoleCache`), holds no stale entry past a delete: the invalidate job removes the entry and its lease.
- A write that changes or deletes a cached row invalidates through an effect: `effects.md`, Cache invalidation.
- `CacheService.flush` runs `flushdb` on the cache client; `MigrationSeedBase` is its one caller.
- `CacheModule.forRoot()` registers the `cache` queue with `CacheQueueFactory` (`queue.job.cacheBackoffDelayInMs`); `CacheProcessor` (`src/common/cache/processors/`), provided by `router.processor.module.ts`, awaits `CacheService.invalidate(data.keys)`, and a connection error retries the job; its messages are `cache.queue.*` in `src/languages/<lang>/cache.json`.
- The session login entry and its purge: `session.md`, Session invalidation. `RoleCache`: `role.md`.

## Class shape

Every `caches/*.cache.ts` has one shape:

- Constructor: `ConfigService`, then the helpers it uses.
- Fields: one `private readonly` key pattern field and one `readonly` TTL field per key, a lease adding its lease key pattern and lease TTL fields, read from config in the constructor and named by `injectable.md`, Config (`ApiKeyCache.cacheTtlInMs`); the TTL is public for the service's `readThrough`.
- Key building: one `build<Subject>Key(...)` per key, public when a service reads through it, filled as `code-style.md`, Composed strings, gives. A leased cache adds `build<Subject>Lease(...)`, the `ICacheLease` for `readThrough`, and `build<Subject>Keys(...)`, public, the entry and lease keys the service passes to `invalidateEffect`.
- Schema: `<Subject>CacheSchema` in the module's `<module>.constant.ts`, any zod schema declared `satisfies z.ZodType<T>` (`z.object({...})`, `z.array(...)`); a cache serving several shapes has one per shape (`Analytic<Shape>CacheSchema`).
- Methods: a read-through cache holds key builders only: no read or delete method, no loader, no try/catch, no logger, and no Lua script. `<Subject>` is the entry's full name, one word across the key builder and every method, and it keeps a segment the class name carries: `ApiKeyCache` has `buildApiKeyKey`, `buildApiKeyLease`, `buildApiKeyKeys`, never `buildKey`.
- A cache injects no repository: the service calls `CacheService.readThrough` with the cache's key, TTL, and lease, the schema constant, and a concise arrow over its repository read (`FeatureFlagService.getByKey`, `src/modules/feature-flag/services/feature-flag.service.ts`).
