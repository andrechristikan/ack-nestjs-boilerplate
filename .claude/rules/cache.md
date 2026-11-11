---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
    - 'src/common/request/services/request.throttle-storage.service.ts'
---

# Cache

- MongoDB is the authority; Redis `db:0` holds caches and throttle counters. A cache entry is never an invariant.
- `RedisModule.forRoot()` (`src/common/redis/redis.module.ts`) owns every Redis client, all ioredis: the cache client (`RedisCacheClientToken`), the queue producer (`RedisQueueClientToken`), and the module-scope queue worker (`RedisQueueWorkerClient`, `queue.md`). `RedisClientFactory` (`src/common/redis/factories/redis.client.factory.ts`) builds each with `lazyConnect`, attaches its `error` listener (one `warn` when the client leaves `ready`, one `log` when it is back), and awaits `connect()`, so the app does not boot while Redis is down; on shutdown it runs `quit()` on a ready client, else `disconnect()`.
- The cache client, on `redis.cache.url`: `enableOfflineQueue: false`, the command timeout `redis.commandTimeoutInMs`, the connect timeout `redis.connectTimeoutInMs`, `keyPrefix` `Cache:` from `redis.cache.namespace`, which prefixes every key, Lua `KEYS` included; code passes unprefixed keys. Nothing queues: a command against a disconnected Redis fails at once (the offline queue is off); one against a connected Redis that does not answer fails after `redis.commandTimeoutInMs`.
- `CacheModule.forRoot()` provides `CacheService` (`src/common/cache/services/cache.service.ts`) over that client: `readThrough`, `invalidate`, `isConnectionError`, `warnOnce`, `isFirstInWindow`. `readThrough` is the one method taking a loader.
- A Redis error falls in one of two classes, decided by `CacheService.isConnectionError`:
    - a connection error, Redis not answering (an `Error` whose message is in `RedisConnectionErrorMessages`, whose `name` is in `RedisConnectionErrorNames`, or whose `code` is in `RedisConnectionErrorCodes`, `src/common/redis/constants/redis.constant.ts`), throws `RedisUnavailableException`: the request answers 503 fast;
    - any other error (an entry failing `JSON.parse` or its schema, a Lua or type error) is a miss: `warnOnce` logs it at `warn` once per key per `redis.warnWindowInMs`, and the read goes on to the database.
- `readThrough(key, schema, ttlInMs, loader, options?)`: every value is plain JSON written with `PX`; a value passing `JSON.parse` and `schema.safeParse` is the hit; a missing entry, a schema failure (the key is deleted), or a non-connection error runs `loader()` and sets its result, a set error classed as above. A `null` result is not stored. The schema revives what JSON drops (`z.coerce.date()`).
- `options.lease`, for a shared hot key (`ApiKeyCache`, `FeatureFlagCache`), holds no stale entry past a delete:
    - on a miss, `readThrough` takes `SET NX PX` on the lease key with a random token from `HelperStringService`;
    - it sets the entry only while the lease still holds that token, in one Lua script (`CacheLeaseSetScript`) that also drops the lease;
    - a reader that took no lease serves the loaded value without a set;
    - the post-commit delete removes the entry and its lease.
- `invalidate(keys)` deletes the keys in one `UNLINK`, none for an empty list, its errors classed as above.
- A session cache purge is a session-module queue job enqueued after the revoke commits and retried by BullMQ (`auth.md`, Session invalidation).
- A cache clear tied to a transaction runs after the commit, never in a `Promise.all` with it.
- Every read-through cache is cache-aside: a write that changes or deletes a cached row deletes its keys after the commit and never sets them; the next read misses and `readThrough` sets the key (`src/modules/api-key/services/api-key.service.ts`: `deleteApiKey` after each committed update or delete).
- The session entry (write and compare-and-set) and the two-factor challenge are authorities, written directly, not cache-aside. `SessionService` re-reads the session row after `setLogin` and deletes the entry when the row is revoked, so revoke, purge, set, re-read always ends without a live entry. The login entry's TTL equals the access-token lifetime (`auth.jwt.accessToken.expirationTimeInSeconds`).
- `SessionCache` and `AuthCache` write on the cache client directly: plain JSON with `PX`, a Lua script (the `SessionCache.updateLogin` compare-and-set), and `GETDEL` (`AuthCache.consumeTwoFactorChallenge`). A Redis error on either fails the request; the challenge claim throws `RedisUnavailableException`, never the invalid-challenge exception.
- `analytic.cache.dashboardTtlInMs` (the global and workspace dashboards) is `ms('30m')`; `anomalySummaryTtlInMs`, `fraudSummaryTtlInMs`, and `riskScoreTtlInMs` are `ms('15m')`.

## Class shape

Every `caches/*.cache.ts` has one shape:

- Constructor: `CacheService` when the cache invalidates, then `ConfigService`, then the helpers it uses. `SessionCache` and `AuthCache` inject `@Inject(RedisCacheClientToken) private readonly redis: Redis` in its place.
- Fields: one `private readonly <subject>KeyPattern: string` and one `readonly <subject>TtlInMs: number` per key, read from config in the constructor, the TTL public for the service's `readThrough`; a lease adds `<subject>LeaseKeyPattern` and `<subject>LeaseTtlInMs` (`auth.xApiKey.leaseKeyPattern` / `leaseTtlInMs`, `featureFlag.leaseKeyPattern` / `leaseTtlInMs`); `private readonly logger = new Logger(<Class>.name)` when it logs.
- Key building: one `build<Subject>Key(...)` per key, public when a service reads through it; one token through `replace` with a function replacement, two or more through `HelperStringService.fillPattern` (`code-style.md`, Composed strings). A leased cache adds `build<Subject>Lease(...)`, the `ICacheLease` for `readThrough`, and `build<Subject>Keys(...)`, the entry and lease keys `delete<Subject>` invalidates, public where a caller outside the class names them (the API-key seed).
- Schema: `<Subject>CacheSchema` in the module's `<module>.constant.ts`, any zod schema declared `satisfies z.ZodType<T>` (`z.object({...})`, `z.array(...)`); a cache serving several shapes has one per shape (`Analytic<Shape>CacheSchema`).
- Methods: a read-through cache holds no read method, no loader, no try/catch, no logger, and no Lua script; `delete<Subject>` is one `invalidate` call. `SessionCache` and `AuthCache` keep `get<Subject>` returning `T | null`, `set<Subject>`, `delete<Subject>`, `update<Subject>` for the compare-and-set, and `consume<Subject>` for a `GETDEL`, returning `T | null`. `create*` and `clear*` are not cache method names. `<Subject>` is the entry's full name, one word across the key pattern field, the key builder, and every method, and it keeps a segment the class name carries: `ApiKeyCache` has `buildApiKeyKey`, `buildApiKeyLease`, `buildApiKeyKeys`, `deleteApiKey`, never `buildKey`; `AuthCache` has `setTwoFactorChallenge`, `getTwoFactorChallenge`, `consumeTwoFactorChallenge`.
- A cache injects no repository: the service calls `CacheService.readThrough` with the cache's key, TTL, and lease, the schema constant, and a concise arrow over its repository read (`FeatureFlagService.getByKey`, `src/modules/feature-flag/services/feature-flag.service.ts`).
