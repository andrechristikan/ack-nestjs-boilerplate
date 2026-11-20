# Database and cache decisions

## Database

### A write conflict is never retried

Rule: `transaction.md`, Transactions.

- A transaction retry in any flow, logout included: a write conflict is rare and the client can send the request again, so one attempt is enough.

### Audit stamping covers the top-level payload only

Rule: `repository.md`, Writes.

- A hand-written relation map: every relation added to the schema also needs an edit in the database kit.
- A generated relation map: it reads the Prisma runtime data model to stamp writes no repository makes.

### Validation fails fast, before the transaction opens

Rule: `transaction.md`, Transactions.

- The guarded statement inside the transaction as the only check: the request opens a transaction, and may write, before it learns of a failure a read would have answered, and the answer is a guard's count where a named validation was owed.
- The read alone, with no guard on the statement: a change between the read and the write passes unchecked.

### Every `ObjectId` field carries a relation

Rule: `repository.md`, Schema.

- A bare id column: nothing ties the value to a row, and no read can `include` or filter through it.
- A relation on the audit fields too: every model would relate to `User` three times over, for values a read never joins.

### One transaction per flow, cross-module allowed

Rule: `transaction.md`, Transactions.

- Two transactions where one suffices: a flow is one transaction, so a failure leaves no committed half.
- A service or a repository opening the transaction: the boundary then hides below the action, and a second caller nests it or splits the flow.
- A compensating write after commit: it exists only when Redis is written after commit, and Redis is not the authority.
- One transaction over every row of a large job: it outlives the transaction's lifetime.

### A relation scalar no query filters on carries no index

Rule: `repository.md`, Schema.

- An index kept for the seed's hard delete: the seed runs rarely and scans once, while the index costs a write on every login, refresh, and device touch.

### A result is one statement: the builder, else one aggregation pipeline

Rule: `repository.md`, Queries; `analytic.md`, One statement.

- A two-step read, the first query's rows driving a second, or a parent and its child as two calls a service stitches: one more round-trip per read, and the pair is not one snapshot.
- Several statements per computation, or rows grouped in the process: round trips, and the read loads the whole range into the API process.
- The builder only, with a scalar copy for each value it cannot group by: a column per card, copied at create, kept only so the builder can reach it.
- A pipeline where one builder call fetches the result: the generated types are lost on that read.
- A `$facet` pipeline per offset list: the Prisma types are lost on every admin list, and the list needs its count either way.
- `findRaw`, `$queryRaw`, or `$executeRaw`: the result leaves the generated types and the select constants, so no type checks it.

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

### MongoDB is required; Redis is required to boot and for the queue; the cache falls back to the database and the rate limit to memory

Rule: `cache.md` and `database.md`.

- 503 on a cache read or from the rate limit while Redis is down: a side resource takes every request down with it.
- No rate limit while Redis is down: the API is unbounded for the whole outage.
- Mongo-based rate limiting: it costs one write per request on every route, landing while MongoDB already carries the uncached reads.
- Fail-open on a MongoDB outage: MongoDB is always on, so its outage answers an error, fast.
- Booting while Redis or MongoDB is down: the half-booted app answers errors until restarted.
- 500 for a MongoDB server-selection timeout: it is an outage the client can retry.
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

- An informational indicator: without Redis the queue stops and the API runs on its fallbacks, an outage a monitor has to see.
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

Rule: `exceptions.md`, The hierarchy; `cache.md`.

- One log and report per request: an outage floods the logs and spends the Sentry quota.
- A per-request log with no Sentry report: the logs still flood and Sentry never sees the outage.
