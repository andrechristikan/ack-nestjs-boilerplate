---
paths:
    - '**/caches/**'
    - 'src/common/cache/**'
    - 'src/common/redis/**'
---

# Cache

- `RedisCacheModule.forRoot()` provides the shared Keyv client on Redis `db:0` (`throwOnErrors: true`, `src/common/redis/redis.module.ts:29`), `CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on it, and a module's `caches/` class holds the cache manager and its config `keyPattern` for every read and write.
- A cache uses the cache manager; a command it lacks (conditional `SET ... XX`, key-pattern `SCAN`) runs on the `RedisClientCachedProvider` store client (`SessionCache.updateLogin`, `deleteLoginsByUser`).
- A cached route is `@Response(path, { cache: true | { key, ttl } })`: the raw return is stored, so the schema declares only JSON-safe shapes (no `z.date()`, `Map`, `Set`). The default TTL is `redis.cache.ttlInMs`; a per-route `ttl` is its own `InMs` key. Never cache a caller-varying response without the caller in the key.
- A failed read falls through to the database, the JWT session read excepted (`exceptions.md`); a cache entry is never an invariant, and the two-factor lock is the one lock. A write fails the request when the entry is the authority (session write on login and refresh rotation, two-factor challenge and lock) or a stale entry keeps a revoked credential working (API key delete after the database write); it is caught and logged where the entry expires on its own (session purges, challenge and lock clears, read-through writes). A write that makes a cached read stale invalidates it in the same operation.
