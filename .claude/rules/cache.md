---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/request/services/request.throttle-storage.service.ts'
---

# Cache

- MongoDB is the authority; Redis `db:0` holds caches and throttle counters. A cache entry is never an invariant.
- `RedisModule.forRoot()` (`src/common/redis/redis.module.ts`) owns every Redis client, all ioredis: the cache client (`RedisCacheClient`), the queue producer (`RedisQueueClient`), and the queue worker (`RedisQueueWorkerClient`, `queue.md`), all three exported. `RedisClientFactory` (`src/common/redis/factories/redis.client.factory.ts`) builds the three clients (`createCache`, `createQueue`, `createQueueWorker`) with `lazyConnect`, attaches each client's `error` listener (one `warn` when the client leaves `ready`, one `log` when it is back), and awaits `connect()`, so the app does not boot while Redis is down; on shutdown it runs `quit()` on a ready client, else `disconnect()`. Every BullMQ `Worker` and `Queue` carries an `error` listener (`QueueProcessorBase.onError`, the `QueueBase` and `HealthQueueIndicator` constructors) that drops a connection error (`CacheService.isConnectionError`), which the factory already logs, and warns on any other.
- The cache client, on `redis.cache.url`: `enableOfflineQueue: false`, the command timeout `redis.commandTimeoutInMs`, the connect timeout `redis.connectTimeoutInMs`, `keyPrefix` `Cache:` from `redis.cache.namespace`, which prefixes every key, Lua `KEYS` included; code passes unprefixed keys. Nothing queues: a command against a disconnected Redis fails at once (the offline queue is off); one against a connected Redis that does not answer fails after `redis.commandTimeoutInMs`.
- `CacheModule.forRoot()` provides `CacheService` (`src/common/cache/services/cache.service.ts`) over that client: `readThrough`, `invalidate`, `invalidateEffect`, `isConnectionError`, `warnOnce`, `isFirstInWindow`. `readThrough` is the one method taking a loader.
- A Redis error falls in one of two classes, decided by `CacheService.isConnectionError`:
    - a connection error, Redis not answering (an `Error` whose message is in `RedisConnectionErrorMessages`, whose `name` is in `RedisConnectionErrorNames`, or whose `code` is in `RedisConnectionErrorCodes`, `src/common/redis/constants/redis.constant.ts`), throws `RedisUnavailableException`: the request answers 503 fast;
    - any other error (an entry failing `JSON.parse` or its schema, a Lua or type error) is a miss: `warnOnce` logs it at `warn` once per key per `redis.warnWindowInMs`, and the read goes on to the database.
- `readThrough(key, schema, ttlInMs, loader, options?)`: every value is plain JSON written with `PX`; a value passing `JSON.parse` and `schema.safeParse` is the hit; a missing entry, a schema failure (the key is deleted), or a non-connection error runs `loader()` and sets its result, a set error classed as above. A `null` result is not stored. The schema revives what JSON drops (`z.coerce.date()`).
- `options.lease`, for a shared hot key (`ApiKeyCache`, `FeatureFlagCache`), holds no stale entry past a delete:
    - on a miss, `readThrough` takes `SET NX PX` on the lease key with a random token from `HelperStringService`;
    - it sets the entry only while the lease still holds that token, in one Lua script (`CacheLeaseSetScript`) that also drops the lease;
    - a reader that took no lease serves the loaded value without a set;
    - the invalidate job removes the entry and its lease.
- `invalidate(keys)` deletes the keys in one `UNLINK`, none for an empty list, its errors classed as above.
- A session cache purge is a session-module outbox row added in the revoke's transaction and retried by BullMQ (`auth.md`, Session invalidation).
- Every read-through cache is cache-aside: a write that changes or deletes a cached row never sets its keys. It opens `OutboxService.withTransaction` over its `*InTx` write and adds `CacheService.invalidateEffect(keys)`, the `invalidate` job on the kit `cache` queue (priority high, no business key); the next read after the job misses and `readThrough` sets the key (`ApiKeyService`, `FeatureFlagService`). A create adds none.
- `CacheModule.forRoot()` registers the `cache` queue with `CacheQueueFactory` (`queue.job.cacheBackoffDelayInMs`); `CacheProcessor` (`src/common/cache/processors/`), provided by `router.processor.module.ts`, awaits `CacheService.invalidate(data.keys)`, and a connection error retries the job; its messages are `cache.queue.*` in `src/languages/<lang>/cache.json`.
- The session entry (write and compare-and-set) and the two-factor challenge are authorities, written directly, not cache-aside. `SessionService` re-reads the session row after `setLogin` and deletes the entry when the row is revoked, so revoke, purge, set, re-read always ends without a live entry. The login entry's TTL equals the access-token lifetime (`auth.jwt.accessToken.expirationTimeInSeconds`).
- `SessionCache` and `AuthCache` write on the cache client directly: plain JSON with `PX`, a Lua script (the `SessionCache.updateLogin` compare-and-set), and `GETDEL` (`AuthCache.consumeTwoFactorChallenge`). A Redis error on either fails the request; the challenge claim throws `RedisUnavailableException`, never the invalid-challenge exception.
- `analytic.cache.dashboardTtlInMs` (the global and workspace dashboards) is `ms('30m')`; `anomalySummaryTtlInMs`, `fraudSummaryTtlInMs`, and `riskScoreTtlInMs` are `ms('15m')`.

## Class shape

Every `caches/*.cache.ts` has one shape:

- Constructor: `ConfigService`, then the helpers it uses. `SessionCache` and `AuthCache` inject `@Inject(RedisCacheClient) private readonly redis: Redis` in its place.
- Fields: one `private readonly <subject>KeyPattern: string` and one `readonly <subject>TtlInMs: number` per key, read from config in the constructor, the TTL public for the service's `readThrough`; a lease adds `<subject>LeaseKeyPattern` and `<subject>LeaseTtlInMs` (`auth.xApiKey.leaseKeyPattern` / `leaseTtlInMs`, `featureFlag.leaseKeyPattern` / `leaseTtlInMs`); `private readonly logger = new Logger(<Class>.name)` when it logs.
- Key building: one `build<Subject>Key(...)` per key, public when a service reads through it; one token through `replace` with a function replacement, two or more through `HelperStringService.fillPattern` (`code-style.md`, Composed strings). A leased cache adds `build<Subject>Lease(...)`, the `ICacheLease` for `readThrough`, and `build<Subject>Keys(...)`, public, the entry and lease keys the service passes to `invalidateEffect`.
- Schema: `<Subject>CacheSchema` in the module's `<module>.constant.ts`, any zod schema declared `satisfies z.ZodType<T>` (`z.object({...})`, `z.array(...)`); a cache serving several shapes has one per shape (`Analytic<Shape>CacheSchema`).
- Methods: a read-through cache holds key builders only: no read or delete method, no loader, no try/catch, no logger, and no Lua script. `SessionCache` and `AuthCache` keep `get<Subject>` returning `T | null`, `set<Subject>`, `delete<Subject>`, `update<Subject>` for the compare-and-set, and `consume<Subject>` for a `GETDEL`, returning `T | null`. `create*` and `clear*` are not cache method names. `<Subject>` is the entry's full name, one word across the key pattern field, the key builder, and every method, and it keeps a segment the class name carries: `ApiKeyCache` has `buildApiKeyKey`, `buildApiKeyLease`, `buildApiKeyKeys`, never `buildKey`; `AuthCache` has `setTwoFactorChallenge`, `getTwoFactorChallenge`, `consumeTwoFactorChallenge`.
- A cache injects no repository: the service calls `CacheService.readThrough` with the cache's key, TTL, and lease, the schema constant, and a concise arrow over its repository read (`FeatureFlagService.getByKey`, `src/modules/feature-flag/services/feature-flag.service.ts`).
