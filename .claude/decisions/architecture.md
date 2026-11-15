# Architecture decisions

Each entry names a choice the rules in `.claude/rules/` carry and gives the reason each plausible alternative was rejected. The rule states what the code does; this page states only why the alternatives lost.

## Layering

### One use case per action, logic shared downward in services

Rule: `layering.md`, Roles.

- Domains as orchestrators: a rules class that orchestrates other modules is a use case in disguise.
- Domain events for orchestration: in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- Grouped multi-method use cases: a use case is one action called by one entry point.
- A separate `src/application/` tier: it gives the same cycle guarantee as use cases kept in their feature at a larger blast, moving the test hook's module mapping, the layout, the router, knip, and every spec mirror.

### A shared cross-module sequence sits in the highest module's service when its subject is that module's

Rule: `service.md`, Shared transactions.

- Always in the highest participating module's service: it puts a lower module's subject into a higher module's service, `WorkspaceService` creating users.
- A module's statements copied per use case: logic left unshared becomes duplicated code.
- A shared use case: a use case calling another use case brings the private-helper problem back one layer up.

### Every use case implements `IAppUseCase` with its own argument and result types

Rule: `use-case.md`, Shape.

- A single input object: it changes every multi-parameter use case's signature and its callers.
- A marker interface with `execute(...args: never[]): Promise<unknown>`: the `unknown` result is what `null-safety.md` limits, and the type check is weak.

### Lint enforces the layer matrix only

Rule: `layering.md`, Dependency order.

- Lint derives the module graph, per-feature policies, and cycles: about 230 lines of config for what the boot and the reviewer catch.
- The dependency order hard-coded in the config: it drifts from the module files.
- `dependency-cruiser` as a second runner: a separate script and pre-commit step where the plugin runs inside `pnpm lint`.
- Rules text alone for the layer matrix: carve-outs are written one by one instead of following from a declared order.
- The dependency order in a separate data file: the feature names only move to another file.

### Each module owns its request context, passed per parameter

Rule: `security.md`, Request store.

- One context type family in the kit, passed whole: the kit must know every feature.
- One store object every guard merges into: the same feature knowledge in the kit, and one type holding every feature.
- An activity-log input shape each caller assembles: every caller repeats the same mapping.
- Services read the CLS store: the store is empty in a job, and the failure surfaces only at runtime.
- A job rebuilds the CLS store from its payload (`ClsService.run`): hidden state another job can forget to set.
- The full context in a job payload: a delayed or retried job decides on rows copied at request time.

### The feature dependency order puts workspace above user and password-history above auth

Rule: `layering.md`, Dependency order.

- User above workspace: workspace services need user lookups and `lastWorkspaceId` writes as their own logic, while the user-side calls into workspace are orchestration that fits a use case.
- Password-history in the kernel: its service injects `AuthPasswordUtil`, so it sits above auth.
- `AuthPasswordUtil` in the kit: it is auth-specific, and the kit takes only a module-agnostic concept with three callers or more.

### Two modules per feature, processors registered in the processor router

Rule: `module-files.md`, Module files.

- One module per feature: `UserModule` and `WorkspaceModule` would import each other, a cycle only `forwardRef` resolves.
- Four modules per feature: two suffice once the use-case module is the leaf, and repository and processor modules add files without adding a boundary.
- The processor in its feature's use-case module: the feature module then registers its own worker, unlike a controller.
- A `<module>.processor.module.ts` per feature: one more module file for every feature with a queue.

### `@Global()` only for guard-injected modules, each with a no-argument `forRoot()`

Rule: `module-files.md`, `@Global()`.

- `ActivityLogModule` global: no guard, strategy, interceptor, or decorator injects it.
- Notification global: no guard injects it, and its importers name `NotificationModule` explicitly.
- Everything global: the NestJS modules guide calls it not a recommended design practice.
- `global: true` in `forRoot()`: the scope hides in a return value instead of on the class.
- A static `@Global() @Module({...})`: two shapes for one kind of module.
- A global module imported again by its use-case module or inside another `forRootAsync`: a global provider is already visible there.
- `FirebaseModule` global: three importers name it, as `AwsModule`'s importers do.

### Only a repository queries the database client; the kit imports no module code or type

Rule: `layering.md`, Roles and Dependency order.

- `databaseService.client` in a service or use case: outside `withTransaction` every statement belongs to the repository that owns the model.
- `import type` from a feature into the kit: the kit still changes with a feature's shape.
- Kit-owned copies a feature extends (`IUser extends IRequestUser`): the kit then holds feature shapes.
- A generic bound at every call site: every annotation repeats one binding.

### The `<module>.` file prefix stays

Rule: `naming.md`, Files.

- Short names (`sign-up.use-case.ts`): the prefix keeps every file findable by a search on its module name, matches the tree, and keeps the spec mirror unambiguous.

### A warn carrying a caught error is object-first

Rule: `injectable.md`, Logger.

- Message-first with the error as an extra argument: nestjs-pino drops the error.
- Every level object-first: it changes call sites that carry no error.

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

## Outbox and queues

### A side effect is an outbox row, kept after completion, with BullMQ as the worker

Rule: `effects.md`.

- No outbox, a post-commit enqueue: a crash or a Redis outage between commit and enqueue loses the side effect, and nothing sends it again.
- A thin outbox deleting rows after enqueue, a cleanup job, or a retention period: the database keeps every side effect's history, and a completed job already leaves BullMQ on its own. A retention sweep is a separate decision, taken if storage calls for it.
- The payload copied into the job: BullMQ is the worker and the database holds the data.

### BullMQ through the outbox is the one async mechanism

Rule: `effects.md`.

- `@nestjs/event-emitter`: in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- `@nestjs/cqrs`: it adds the same second, non-durable in-memory mechanism.

### Each feature registers its own queues

Rule: `queue.md`, Where things live.

- Every queue registered in the queue kit: the kit would know every feature.
- One fast-fail connection for workers too: workers would error during an outage instead of waiting.
- A module-level client in the decorator: it builds a Redis client outside the redis module, which can neither log nor close it.
- The worker `configKey`: the explorer ignores it for a registered queue.
- Writing the internal `bullmq:worker_metadata`: a private key of `@nestjs/bullmq` an upgrade may change.
- A kit worker registrar through `DiscoveryService`: it rebuilds the worker creation and shutdown the explorer already owns.
- A kit health check over every queue: health only needs to know BullMQ runs.
- One `EnumQueue` or a `<module>.queue.enum.ts` file: `Enum<Module>Queue` in `<module>.enum.ts` follows the enum rule.
- `process.env` in the decorator: only the config boundary reads the environment.

### The outbox is a kit module beside the queue kit

Rule: `outbox.md`.

- The outbox in `src/modules/`: the kit then imports a feature above it.
- A kit port the feature `OutboxService` implements: an abstraction for one implementor.
- The outbox merged into the queue kit: the queue kit then holds rows and registers a queue.
- A kit use-case layer for the sweep: the kit has no use cases, and `CacheProcessor` already calls `CacheService` directly.
- Importing `OutboxModule` in every module that needs it: the processor router and every module writing an effect would carry the same import.
- A `@nestjs/schedule` cron sweep: it runs on every replica and adds a dependency, where a BullMQ job scheduler runs each tick once.

### A statement and its outbox row share one transaction, and the opener dispatches

Rule: `effects.md`, Writing.

- A non-transactional add after the statement: a crash or a MongoDB failure between the two loses the effect the outbox exists to keep.
- Only the use case dispatches, the ids returned through every layer: every `*InTx` signature and callback carries outbox ids, and a dropped return leaves the row to the sweep.
- The opener keeps its `tx` and asks `OutboxService` to dispatch after the commit: every opener holds `tx` outside its callback, and a forgotten call fails silently.

### The outbox key is unique per queue and process

Rule: `effects.md`, Effects.

- No unique index: a raced duplicate row has no database guarantee.
- A unique index on the key alone: the guarantee belongs to one queue and process, and keys of different queues may coincide.

### The sweep recovers pending rows and reconciles stale enqueued ones with their job

Rule: `outbox.md`, Dispatch.

- Boot drain alone: a row whose `add` failed would stay `pending` until the next restart.
- Retry on the next request: recovery latency would depend on traffic and every request would pay an extra query.
- Dispatch a stale enqueued row again and shift `enqueuedAt`: a job that failed on every attempt runs again once BullMQ's retention drops it.
- Leave a stale enqueued row: its outcome is lost from the history.

### Step state lives in the outbox row

Rule: `notification.md`, Fan-out and send.

- `job.updateData`: the row is the one source every attempt and every dispatch reads, and the recorded decision is part of the history.

## Cache and Redis

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
- Cache the user too: every user write (status, role, password, profile, two-factor) would need an invalidation, and a missed one delays a block.

### `CacheService.readThrough` is the one cache loader

Rule: `cache.md`.

- Cache-class read methods taking the loader too: it widens the exception to every cache class.
- No callback at all: get, lease, load, and set are copied at about 55 call sites.

### A Redis or MongoDB outage is logged once per window

Rule: `exceptions.md`, The hierarchy.

- One log and report per request: an outage floods the logs and spends the Sentry quota.
- A per-request log with no Sentry report: the logs still flood and Sentry never sees the outage.

### Health follows Redis

Rule: `config.md`.

- An informational indicator: the API is not healthy without its cache.

## Notifications and import

### The notification processor resolves the recipient

Rule: `notification.md`, Recipient.

- A producer snapshot for every kind: the user, settings, address, and live-session tokens still exist after commit, so a producer-side read only copies machinery into every service.

### Admin import is a job, export is not

Rule: `login.md`.

- Synchronous import: hashing up to fifty passwords and one bulk transaction would hold the request open.
- Asynchronous export: the response is the file.

## Infrastructure

### Compose variables live in `.env.docker`

Rule: `docker.md`, Credentials and variables.

- A tracked `.env.docker.example`: every key is optional in development and the docs list them.
- One `.env` for the application and Compose: the container and Vault receive credentials the application never reads.
- `COMPOSE_ENV_FILES` in each developer's shell: the setting lives outside the repository.
- Production left on `--env-file .env`: two environments would follow two rules.
- Default credentials in production: a forgotten file starts MongoDB and Redis open.
- Compose secrets for the passwords: the same passwords stay in the application's URLs.

### S3 without bucket versioning

Rule: `file.md`.

- Version-aware list and delete: the bucket is not versioned by design.
