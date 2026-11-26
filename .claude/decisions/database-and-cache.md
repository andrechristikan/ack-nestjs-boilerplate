# Database and cache decisions

## Database

### A write conflict is never retried

Rule: `transaction.md`, Transactions.

- A transaction retry in any flow, logout included: a write conflict is rare and the client can send the request again, so one attempt is enough.

### Audit stamping covers the top-level payload only

Rule: `repository.md`, Writes.

- A hand-written relation map: every relation added to the schema also needs an edit in the database kit.
- A generated relation map: it reads the Prisma runtime data model to stamp writes no repository makes.

### Validation fails fast, before the transaction opens, its checks in one `Promise.all`

Rule: `transaction.md`, Transactions; `concurrency.md`, Together and alone.

- The guarded statement inside the transaction as the only check: the request opens a transaction, and may write, before it learns of a failure a read would have answered, and the answer is a guard's count where a named validation was owed.
- The read alone, with no guard on the statement: a change between the read and the write passes unchecked.
- Every gate first: the checks sit on one level, and the first to fail answers.

### A one-row write returns its row through `update()` or `delete()`, its P2025 an internal failure unless its contract names it

Rule: `transaction.md`, Queries.

- `updateMany`, then a re-read: a second call for a row the write already holds.
- `updateMany`, with the row rebuilt from the fail-fast read or from values: the rebuilt row is a copy that drifts from what the write stored, its stamps and the fields the write set.
- The Prisma error in place of the fail-fast read: P2025 cannot tell a missing row from a row in the wrong state, and the transaction opens before the request learns either.

### A database error is an internal failure unless its repository's database-error contract names it

Rule: `repository.md`, Writes; `exceptions.md`, Who throws; `transaction.md`, Queries and Generated unique values; `layering.md`, Roles.

- Mapping in the use case per flow: every flow repeats the mapping, and database logic belongs in the repository.
- One contract per module: one field name such as `nonce` and one P2025 answer would span several models.
- One contract per module keyed by model: a nesting level, and the base would need its model name.
- A per-call `miss` exception: a race answered as a business 4xx the fail-fast read already owns.
- A special answer for a lost race beside the one mapping (`null` for a P2025, `false` for a collision): a second answer channel.
- A callback building the exception: every call site adds a function to defer an exception that costs nothing to build in the catch.
- A repository `errorModule` field: the exception names its module.
- An `IDatabaseRepository` interface beside the base: an interface cannot declare the base's protected members.
- A kit retry helper `withUniqueRetry`: the transaction shape stays the use case's.
- A module exhaustion exception per field: no client acts on it.

### `AppGeneralFilter` maps no database error

Rule: `filter.md`.

- Keeping 400 for an invalid id and 503 for an unreachable database: reads and writes would answer two ways.
- Mapping only wrapped errors: a raw error and a wrapped one of the same failure would answer two ways.

### Every `ObjectId` field carries a relation

Rule: `repository.md`, Schema.

- A bare id column: nothing ties the value to a row, and no read can `include` or filter through it.
- A relation on the audit fields too: every model would relate to `User` three times over, for values a read never joins.

### A generated value that references no row is a plain `String` (`claimNonce`, `batchId`)

Rule: `repository.md`, Schema.

- A batch model for `TermPolicyRecipient.batchId` to relate to: no read uses it.

### One transaction per flow whose writes span more than one table or include an outbox row, cross-module allowed; an unbounded cascade is a chunked, idempotent job

Rule: `discipline.md`, Hard rules; `transaction.md`, Transactions; `database.md`.

- Two transactions where one suffices: a flow is one transaction, so a failure leaves no committed half.
- A service or a repository opening the transaction: the boundary then hides below the action, and a second caller nests it or splits the flow.
- A compensating write after commit: it exists only when Redis is written after commit, and Redis is not the authority.
- One transaction over every row of a large job: it outlives the transaction's lifetime.
- One request transaction over an unbounded cascade: it holds an unbounded number of writes.
- Chunks inside the request transaction: the transaction still holds every row.
- The outbox row left out of the boundary, added in a second commit: a crash between the two commits loses the row.
- A transaction for every write: ceremony on a one-table write with no outbox row, which needs no atomicity with anything.
- An `afterCommit` callback alone for a Redis or BullMQ update: nothing recovers it when the process dies after the commit, where the sweep recovers an outbox row.

### A cap is counted once, before the transaction

Rule: `transaction.md`, Queries.

- A second count inside the transaction that creates the row: it closes only the window between the first count and the insert, which Normal use leaves out, while two concurrent creating transactions pass it anyway.

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

### A cascade over several workspaces reads each model once by `workspaceId: { in }`, in a job as in a request

Rule: `repository.md`, Queries.

- One read per workspace because the flow runs in the background: a job pays the same call per workspace and model that a request does, and holds its transaction open while they run.

### A model's responses share its default response shapes

Rule: `repository.md`, Selects.

- A select per response: the shapes multiply with the routes, and a field one response gains forks another near-copy.
- Dropping a relation from one list to save payload: the include costs no extra call, and the list leaves the shape every other response of the model shares.

### A generated result is a row per item under a run id

Rule: `analytic.md`.

- One document per signal holding the item list: it is bounded by the document size, cut at a row cap, and sorted in memory.
- Replacing rows inside one transaction: thousands of writes run against the transaction lifetime.

### A generated snapshot list is one pipeline

Rule: `pagination.md`; `analytic.md`.

- A header read, then `PaginationService.offset` over the items: two calls per page, and a refresh between them can replace the run the header names.

### The current time comes from `HelperDateService.now()`; `create(date)` takes a given date

Rule: `code-style.md`, Dates.

- One `create(date: Date | null)` with `null` meaning now: every clock read passes `null`, and the name hides the clock read.
- An optional `create(date?)`: `null-safety.md` refuses an optional service parameter.

## Concurrency

### Independent statements on one `tx` run in one `Promise.all`, reads apart from writes

Rule: `concurrency.md`, Together and alone.

- Always in turn: the MongoDB Node.js driver documents no support for parallel operations in one transaction, but a rolled-back probe of 780 parallel transactions and 60 committed refreshes through `DatabaseService.withTransaction` on Prisma failed none.
- A read beside a write on one `tx`: a write follows its checks.
- Any read on `tx` bars its method: a read that only serves the method's own write validates nothing, and barring it puts independent writes back in turn.

### A cheap check precedes the expensive or external work it guards

Rule: `concurrency.md`, Together and alone.

- Every independent call in one `Promise.all`: a refused request would still run the S3 reads to save a millisecond on the accepted one.

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

### The user guard reads the user with its role in one include

Rule: `guards.md`, Guards; `role.md`.

- Caching the role: every role and policy write carries an invalidation effect, and the guard runs a cache read beside the user read.
- Caching the user: every user write (status, role, password, profile, MFA) would need an invalidation, and a missed one delays a block.

### `CacheService.readThrough` is the one cache loader

Rule: `cache.md`.

- Cache-class read methods taking the loader too: every cache class then carries a loader parameter and its own miss and set handling.
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

### Every 5xx and every warning an outage causes is logged, and every 5xx reported, with no window

Rule: `exceptions.md`, The hierarchy; `cache.md`; `outbox.md`, Dispatch.

- Once per window: the extent and the end of an outage are not visible.
- A per-request log with no Sentry report: Sentry never sees the outage.

### Every `error` event of a Redis client, a BullMQ queue, or a worker is logged

Rule: `cache.md`.

- One line per outage through a down-state set: each failed reconnect after the first leaves no line.
- Dropping a connection error in the BullMQ listeners because the Redis client factory logs it: a queue's own connection failure is not in the log.
