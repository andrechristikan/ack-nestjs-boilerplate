---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
---

# Cache

- `RedisCacheModule.forRoot()` provides the shared Keyv client on Redis `db:0` (`throwOnErrors: true`, `src/common/redis/redis.module.ts:29`), `CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on it, and a module's `caches/` class holds the cache manager and its config `keyPattern` for every read and write.
- A cache uses the cache manager; a command it lacks (conditional `SET ... XX`) runs on the `RedisClientCachedProvider` store client (`SessionCache.updateLogin`).
- A cached route is `@Response(path, { cache: true | { key, ttl } })`: the raw return is stored, so the schema declares only JSON-safe shapes (no `z.date()`, `Map`, `Set`). The default TTL is `redis.cache.ttlInMs`; a per-route `ttl` is its own `InMs` key. Never cache a caller-varying response without the caller in the key.
- A failed read falls through to the database, the JWT session read excepted (`exceptions.md`); a cache entry is never an invariant, and the two-factor lock is the one lock. A write fails the request when the entry is the authority (session write on login and refresh rotation, two-factor challenge and lock) or a stale entry keeps a revoked API key working (the synchronous delete after the database write); it is caught and logged inline where the entry expires on its own (challenge and lock deletes, read-through writes, feature-flag invalidation). A write that makes a cached read stale invalidates it in the same operation.
- A session cache purge is a session-module queue job enqueued after the revoke commits and retried by BullMQ (`security.md`, Session invalidation).
- A cache clear tied to a transaction runs after the commit, never in a `Promise.all` with it.

## Class shape

Every `caches/*.cache.ts` has one shape:

- Constructor: `@Inject(CacheMainProvider) private readonly cacheManager: Cache`, then `ConfigService`, then the helpers it uses. `SessionCache` adds `@Inject(RedisClientCachedProvider) private readonly keyv: Keyv` for its store-client calls (`getLogin`, the `XX` write). Every cache injects `CacheMainProvider`; no module re-provides the cache manager under its own token.
- Fields: one `private readonly <subject>KeyPattern: string` and one `private readonly <subject>TtlInMs: number` per key, read from config in the constructor; `private readonly logger = new Logger(<Class>.name)` when it logs. A TTL computed per write from a config duration (the two-factor lock, `2^(attempt/maxAttempt) * lockAttemptDurationInMs`) has no `<subject>TtlInMs` field; each config key it reads is a `private readonly` field.
- Key building: one private `build<Subject>Key(...)` per key; one token through `replace` with a function replacement, two or more through `HelperStringService.fillPattern` (`code-style.md`, Composed strings).
- Methods: `get<Subject>` returning `T | null`, `set<Subject>`, `delete<Subject>`, and `update<Subject>` for the `XX` write; `create*` and `clear*` are not cache method names. A read whose value is the entry's remaining TTL is `get<Subject>TtlInMs` returning `number`, the one `get` not returning `T | null`. The two-factor methods: `setTwoFactorChallenge`, `getTwoFactorChallenge`, `deleteTwoFactorChallenge`, `setTwoFactorLock`, `getTwoFactorLockTtlInMs`, `deleteTwoFactorLock`. A failure follows the read and write bullet above.
- A cache injects no repository: a read-through (read the cache, read the database on a miss, write the cache) is the domain's.
