---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
---

# Cache

- `RedisCacheModule.forRoot()` provides the shared Keyv client on Redis `db:0` (`throwOnErrors: true`, `RedisCacheModule.forRoot`, `src/common/redis/redis.module.ts`), `CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on it, and a module's `caches/` class holds the cache manager and its config `keyPattern` for every read and write.
- A cache uses the cache manager. A command it lacks runs on the `RedisClientCachedProvider` store client: a Lua script (the `SessionCache.updateLogin` compare-and-set, the lease-held set), `SET NX PX` (the lease take), and `GETDEL` (`AuthCache.consumeTwoFactorChallenge`). The key is built with `store.createKeyPrefix`, the value (de)serialized through Keyv.
- A cached route is `@Response(path, { cache: true | { key, ttl } })`: the raw return is stored, so the schema declares only JSON-safe shapes (no `z.date()`, `Map`, `Set`). The default TTL is `redis.cache.ttlInMs`; a per-route `ttl` is its own `InMs` key. Never cache a caller-varying response without the caller in the key.
- A failed read falls through to the database, the JWT session read excepted (`exceptions.md`); a cache entry is never an invariant. A write fails the request when the entry is the authority (session write on login and refresh rotation, two-factor challenge write) or a stale entry outlives a committed write (the post-commit delete of an `ApiKeyCache` or `FeatureFlagCache` key); it is caught and logged inline where the entry expires on its own (every read-through lease take and set). The two-factor challenge claim is a `GETDEL` on the store client: a store error throws `RedisUnavailableException`, never the invalid-challenge exception. A write that makes a cached read stale invalidates it in the same operation.
- A session cache purge is a session-module queue job enqueued after the revoke commits and retried by BullMQ (`auth.md`, Session invalidation).
- A cache clear tied to a transaction runs after the commit, never in a `Promise.all` with it.
- Every read-through cache is cache-aside: a write that changes or deletes a cached row deletes the key after the commit and never sets it; the next read misses, reads the database, and sets the key (`src/modules/api-key/services/api-key.service.ts`: `deleteApiKey` after each committed update or delete, `setApiKey` on a miss in `validateXApiKey`).
- A leased read-through (`ApiKeyCache`, `FeatureFlagCache`) holds no stale entry past a delete:
    - on a miss, the service takes `SET NX PX` on the lease key with a random token from `HelperStringService`;
    - it reads the database and sets the entry only while the lease still holds that token, in one Lua script that also drops the lease;
    - a reader that took no lease serves the database row without caching;
    - the post-commit delete removes the entry and its lease.
- The session entry (write and compare-and-set) and the two-factor challenge are authorities, written directly, not cache-aside. `SessionService` re-reads the session row after `setLogin` and deletes the entry when the row is revoked, so revoke, purge, set, re-read always ends without a live entry. The login entry's TTL equals the access-token lifetime (`auth.jwt.accessToken.expirationTimeInSeconds`).
- `analytic.cache.dashboardTtlInMs` (the global and workspace dashboards) is `ms('30m')`; `anomalySummaryTtlInMs`, `fraudSummaryTtlInMs`, and `riskScoreTtlInMs` are `ms('15m')`.

## Class shape

Every `caches/*.cache.ts` has one shape:

- Constructor: `@Inject(CacheMainProvider) private readonly cacheManager: Cache`, then `ConfigService`, then the helpers it uses. A cache with store-client calls adds `@Inject(RedisClientCachedProvider) private readonly keyv: Keyv`: `SessionCache` (`getLogin`, the compare-and-set), `AuthCache` (the challenge claim), `ApiKeyCache` and `FeatureFlagCache` (the lease). Every cache injects `CacheMainProvider`; no module re-provides the cache manager under its own token.
- Fields: one `private readonly <subject>KeyPattern: string` and one `private readonly <subject>TtlInMs: number` per key, read from config in the constructor; a lease adds `<subject>LeaseKeyPattern` and `<subject>LeaseTtlInMs` (`auth.xApiKey.leaseKeyPattern` / `leaseTtlInMs`, `featureFlag.leaseKeyPattern` / `leaseTtlInMs`); `private readonly logger = new Logger(<Class>.name)` when it logs.
- Key building: one private `build<Subject>Key(...)` per key; one token through `replace` with a function replacement, two or more through `HelperStringService.fillPattern` (`code-style.md`, Composed strings).
- Methods: `get<Subject>` returning `T | null`; `set<Subject>`, taking the lease token when the entry is leased; `delete<Subject>`; `update<Subject>` for the compare-and-set write; `take<Subject>Lease` returning `string | null`; `consume<Subject>` for a `GETDEL`, returning `T | null`. `create*` and `clear*` are not cache method names. `<Subject>` is the entry's full name, one word across the key pattern field, the key builder, and every method, and it keeps a segment the class name carries: `ApiKeyCache` has `getApiKey`, `takeApiKeyLease`, `setApiKey`, `deleteApiKey`, never `getKey`; `AuthCache` has `setTwoFactorChallenge`, `getTwoFactorChallenge`, `consumeTwoFactorChallenge`. A failure follows the read and write bullet above.
- A cache injects no repository: a read-through (read the cache, read the database on a miss, write the cache) is the service's.
