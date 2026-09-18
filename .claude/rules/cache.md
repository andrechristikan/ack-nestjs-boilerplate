# Cache

This file is the rule set. Flow narrative: `docs/cache.md` — explorer or planner.

## One Redis connection, two databases

Redis `db:0` is the cache, `db:1` is BullMQ. Both go through the modules that already own the
connection — `RedisCacheModule.forRoot()` provides the shared Keyv client,
`CacheMainModule.forRoot()` wires `@nestjs/cache-manager` on top of it, and
`QueueModule.forRoot()` owns the two BullMQ connections (`rules/queue.md`). Cache modules are
global. `QueueModule` carries no `@Global()`; `BullModule.forRootAsync` is already `global: true`.

**Never open a second Redis connection.** Not in a feature module, not in a util, not "just for
this one lock".

## A module's cache reads and writes live in a cache class

A feature that caches gets a cache class at
`src/modules/<feature>/caches/<module>[.<concern>].cache.ts` — `SessionCache`,
`ApiKeyCache`, `FeatureFlagCache`, `AuthCache`, `AnalyticCache`. It holds the cache manager and the
`keyPattern` it reads from config. It is not a service: no `Service` in the class or file
name, and it has no header interface (`rules/architecture.md`). `<feature>.domain.module.ts` still
provides it (`rules/nest-wiring.md`). Every get, set and delete for that module goes
through it, so one class owns the key shape and the invalidation path for a given pattern.

**A util never touches the cache.** It shapes data and does no IO (`rules/architecture.md`), so
the cached value reaches it as an argument.

## Caching a response

Caching is decorator-driven on the route:

```typescript
@Response('user.profile', { cache: true })
@Response('user.profile', { cache: { key: '…', ttl: … } })
```

`@Response` / `@ResponsePaging` push `CacheKey` and `CacheTTL` and mount
`ResponseCacheInterceptor` when `options.cache` is present. A hand-mounted
`@UseInterceptors(CacheInterceptor)` on a route is the wrong path.

- **A cached route's response schema declares only shapes that survive a JSON round trip** — no
  `z.date()`, no `Map`, no `Set`, no class instance. `ResponseCacheInterceptor` is mounted INSIDE
  `ResponseInterceptor`, so Redis holds the handler's raw return and `ResponseInterceptor`
  validates what comes back out of it against the route's schema; a value JSON cannot reproduce
  is rejected on every cache hit. A cached route that carries a date declares it as a string or a
  number.
- **The TTL default is config, not a literal.** `redis.cache.ttlInMs` is the app-wide default,
  and a per-route `ttl` comes from a config key of its own. cache-manager takes milliseconds, so
  both keys carry the `InMs` suffix and the route passes the value straight through
  (`rules/config.md`).
- **Never cache a response that varies by caller without the caller in the key.** A cached
  route whose body depends on `request.user`, on the workspace header, or on a role will serve
  one caller's data to another. If the key cannot express the variation, the route is not
  cacheable.
- **Never cache a response that carries a credential** (`rules/security.md`).

## Cache is best-effort, except where it carries authority

A cache read that fails falls through to the database. Nothing about correctness may depend on
a cache hit, and a cache entry is never a lock (`rules/concurrency.md`).

Writes and deletes are not uniformly best-effort. The Keyv store runs with `throwOnErrors`, so
a Redis failure rejects instead of passing silently, and each caller decides what that means:

- **It fails the request** when the entry IS the authority for what follows: the session cache
  write on login and on refresh rotation, and the two-factor challenge write. A token the guards
  cannot read is worse than a failed login.
- **It fails the request** when a stale entry would keep a revoked credential working: the API
  key cache delete runs after the database write, sequentially, so the change is audited and the
  failure is visible.
- **It is caught and logged** where the entry expires on its own and the database still holds
  the truth: every session purge after a commit, the challenge and lock clears, and the API key
  read-through write.

A whole-user session purge scans the user's key pattern (`SCAN` plus `UNLINK`, batched); a
partial revoke deletes exactly the ids it revoked (`rules/security.md`).

## Invalidation is part of the write

A write that makes a cached read stale invalidates it in the same operation. A cached value
with no invalidation path is a bug with a delay on it — say which key a new write invalidates,
or say why nothing caches that read.

## Keys

A cache or lock key is a `keyPattern` string in a config file. The shape of that string —
`PascalCase` segments, `{placeholder}` tokens, no prefix-append — is `rules/naming.md`
→ "Redis keys", and it is not restated here.
