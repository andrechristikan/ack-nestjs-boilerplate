# Outbox and queue decisions

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
- The producer connection set in each feature's queue factory: `@nestjs/bullmq` builds each worker from its queue's own options, so the worker would inherit it.

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

### An activity entry is written by whoever runs the write, in that write's transaction

Rule: `activity-entry.md`.

- Rows staged in the CLS store and flushed by an interceptor: an entry would be staged in one place and written in another, and an error path would lose it.
- The `ActivityLog` row inserted in the business transaction: the outbox row already commits with the write, and the job keeps the insert off the request path.

### A date is stored and passed as ISO 8601 and formatted at render

Rule: `code-style.md`, Dates.

- RFC 2822 strings in `Outbox.data` and `Notification.metadata`: a client reading the notification list would get a display string where every other stored value is ISO 8601.

## Notification jobs

### The notification processor resolves the recipient

Rule: `notification.md`, Recipient.

- A producer snapshot for every kind: the user, settings, address, and live-session tokens still exist after commit, so a producer-side read only copies machinery into every service.

### The term-policy batch email job stays on `notificationEmail`

Rule: `notification.md`, Term-policy publish.

- A `termPolicyEmail` queue: a BullMQ limiter binds one queue, so two email queues together send to SES at twice the limited rate.
- The batch send on the `termPolicy` queue: that queue has no limiter, and a limiter cannot bind one job name.

### A term-policy resend is a `publish` job

Rule: `notification.md`, Term-policy publish.

- A `resendPublish` job: it runs the same use case as `publish`, and only its key and `resendNonce` tell the two apart.
- A separate resend process use case (`TermPolicyProcessResendPublishUseCase`): the paging loop reads `UserService`, which sits above term-policy, so it cannot move down into a term-policy service and would be duplicated.
- The process passed to `execute`: the use case would take a job name as an argument for its message alone.

### A term-policy publish copies its content before its transaction

Rule: `role.md`.

- A `publishing` status moved to `published` by the copy job: a new enum value and transition, and a row that stays in it when the job fails on every attempt.
- The copy as a job after the row turns `published`: a failed job leaves every user gated behind a document whose links answer 404.

### An email body is a seeded SES template

Rule: `notification.md`, Fan-out and send.

- Rendering in the application and sending raw mail: the job payload would carry a rendered body, where a template keeps it to template data.

### The term-policy broadcast is delivered at most once per recipient

Rule: `notification.md`, Term-policy publish.

- At-least-once, releasing the claim on an unknown SES outcome: a duplicate legal notice to every user costs more than one missed mail, which a resend covers.

### The term-policy module owns `TermPolicyRecipient`, the fan-out, and the `publish` job

Rule: `notification.md`, Term-policy publish.

- The recipient statements, the fan-out, and the publish jobs in the notification module: term-policy sits above notification in the dependency order, so the lower module would hold the higher module's data and flow.
