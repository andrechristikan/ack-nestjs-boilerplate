# Database and cache decisions

## Database

### A write conflict is never retried

Rule: `transaction.md`, Transactions.

- A transaction retry in any flow, logout included: a write conflict is rare and the client can send the request again, so one attempt is enough.

### Audit stamping covers the top-level payload only

Rule: `repository.md`, Writes.

- A hand-written relation map: every relation added to the schema also needs an edit in the database kit.
- A generated relation map: it reads the Prisma runtime data model to stamp writes no repository makes.

### One transaction per flow, cross-module allowed

Rule: `transaction.md`, Transactions.

- Two transactions where one suffices: a flow is one transaction, so a failure leaves no committed half.
- A compensating write after commit: it exists only when Redis is written after commit, and Redis is not the authority.

### A relation scalar no query filters on carries no index

Rule: `repository.md`, Schema.

- An index kept for the seed's hard delete: the seed runs rarely and scans once, while the index costs a write on every login, refresh, and device touch.

### An analytic repository uses the builder or one aggregation pipeline; a feature repository uses the builder

Rule: `repository.md`, Queries; `analytic.md`, One statement.

- The builder only, with a scalar copy for each value it cannot group by: a column per card, copied at create, kept only so the builder can reach it.
- Several statements per computation, or rows grouped in the process: round trips, and the read loads the whole range into the API process.
- A raw query or pipeline outside analytic: its result leaves the generated types and the select constants, so no type checks it.

### A read of a parent and its children is one builder call

Rule: `repository.md`, Queries.

- One MongoDB command through `aggregateRaw` in a feature repository: the generated types are lost on every read.
- Removing repeated reads only: a parent and its child stay two calls a service stitches.
- A `$facet` pipeline per offset list: the Prisma types are lost on every admin list, and the list needs its count either way.

### A generated result is a row per item under a run id

Rule: `analytic.md`.

- One document per signal holding the item list: it is bounded by the document size, cut at a row cap, and sorted in memory.
- Replacing rows inside one transaction: thousands of writes run against the transaction lifetime.

## Cache and Redis

### The cache and BullMQ run on separate Redis instances

Rule: `docker.md`, Local.

- One instance with `noeviction`: the cache has no memory bound and takes the queues down with it.
- One instance with `allkeys-lru`: an evicted key corrupts a queue.

### Cache invalidation is a job

Rule: `effects.md`, Cache invalidation.

- A synchronous delete that fails the request: a failed delete after commit fails a request whose write already committed.

### MongoDB is the only authority; Redis is a cache

Rule: `cache.md`.

- Redis as the session authority: a Redis error after a login or refresh commit revokes the committed session or signs the user out.
- Write-through as the consistency mechanism: a failed write-through leaves old data, while a failed delete leaves it only until the TTL.

### Redis and MongoDB are both required

Rule: `cache.md` and `database.md`.

- Fail-open on an outage: Redis and MongoDB are always on, so an outage of either answers an error, fast.
- Mongo-based rate limiting: it costs one write per request on every route.
- Booting while Redis or MongoDB is down: the half-booted app answers errors until restarted.
- 500 for an enqueue's connection error or a MongoDB server-selection timeout: each is an outage the client can retry.
- The driver's default server-selection timeout: a request waits 30 seconds before it fails.

### ioredis directly, for the cache and BullMQ

Rule: `cache.md`.

- Keyv over `@keyv/redis`: a second client library beside BullMQ's ioredis, with its own errors, a value envelope, and an `overrides:` pin.
- `cache-manager`: its `get` swallows every store error and returns `undefined`, so a read-through built on it never sees a connection error.

### The guard caches the role, not the user

Rule: `role.md`.

- No cache: three models per request.
- Cache the user too: every user write (status, role, password, profile, MFA) would need an invalidation, and a missed one delays a block.

### `CacheService.readThrough` is the one cache loader

Rule: `cache.md`.

- Cache-class read methods taking the loader too: it widens the exception to every cache class.
- No callback at all: get, lease, load, and set are copied at about 55 call sites.

### Health follows Redis, behind the system API key, and the database route answers 503 while a dependency is down

Rule: `config.md`; the API key: `guards.md`, Decorator order.

- An informational indicator: the API is not healthy without its cache.
- An unauthenticated readiness route: every health route stays behind an API key.
- 200 with the status in the body only: a monitor reads the status code.

### A seed run empties the cache Redis

Rule: `seeding.md`, Idempotency and reset.

- Per-key invalidation in each seed: a cache a seed forgets stays stale, and the analytic keys cannot be named.

### The membership guards read the database on every request

Rule: `guards.md`, Guards.

- A cache in front of the workspace and project membership guards: a removed member would pass until the invalidation job ran, and the invalidation would span every membership flow.

### The term-policy guard reads the published policies with the caller's acceptances in one call

Rule: `guards.md`, Guards.

- A `none` relation filter on the acceptances: its `$lookup` may scan every acceptance of a policy.
- A cache of the published policies: a key, an effect, and an invalidation job for one small indexed read.

## Outage logging

### A Redis or MongoDB outage is logged once per window

Rule: `exceptions.md`, The hierarchy.

- One log and report per request: an outage floods the logs and spends the Sentry quota.
- A per-request log with no Sentry report: the logs still flood and Sentry never sees the outage.
