# Outbox and queue decisions

## Outbox and queues

### A side effect is an outbox row, kept after completion, its payload scrubbed after the retention, with BullMQ as the worker

Rule: `effects.md`; `outbox.md`, Retention.

- No outbox, a post-commit enqueue: a crash or a Redis outage between commit and enqueue loses the side effect, and nothing sends it again.
- A thin outbox deleting rows after enqueue, or a cleanup job: the database keeps every side effect's history, and a completed job already leaves BullMQ on its own.
- Deleting rows after the retention: an old idempotency key inserts again, and a once-per-subject send can repeat.
- The payload copied into the job: BullMQ is the worker and the database holds the data.

### BullMQ through the outbox is the one async mechanism

Rule: `effects.md`.

- `@nestjs/event-emitter`: in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- `@nestjs/cqrs`: it adds the same second, non-durable in-memory mechanism.

### A job is one flow in its processor use case, and pages its unbounded part itself after its transaction

Rule: `use-case.md`, Jobs; `transaction.md`, Transactions.

- A job queuing another module's job for its cascade (`softDeleteByWorkspace` on the `project` queue): one deletion is read across two processors.
- The account deletion queuing `softDelete` and a memberships job: a deleted account keeps live workspaces when a follow-up job fails (`auth.md`, Self-delete validates in the request and a job deletes).
- Every project of a workspace in the one transaction: it is unbounded.
- A service method holding the entry and the cascade: it hides the sequence below the use case.

### The side effects a job's flow may add are a closed list, and lint narrows a processor use case's own queue imports by folder

Rule: `effects.md`; `eslint.md`, Boundaries.

- Only `notification` and kit jobs in a job's flow: it forbids an activity entry and an S3 delete from a job.
- Any module's job called a side effect: a domain write hides in a queued job.
- A lint list of queue class names: every new kit queue edits it.
- The reviewer alone: a breach waits for a review instead of failing the lint.

### The workspace delete route queues the `softDelete` job

Rule: `use-case.md`, Jobs.

- The route deleting in the request: it holds the request open over every project chunk.
- Every cascade, a session revoke included, as a job: a session revoke, a device removal, and an MFA factor wipe commit with the action that causes them.
- The project delete route queuing a job per project: an action on one row stays in the request.

### The session cache purge runs on the session module's own `session` queue, the user's purge on `userAuth`, and every worker runs one job at a time

Rule: `queue.md`, Enqueuing and Processors; `session.md`, Session invalidation; `effects.md`, Effects.

- `purgeLogins` on `userAuth`: a session job on another module's queue, where each module runs its jobs on its own queue.
- The user's purge on the `user` queue: it waits behind a running import, export, or account deletion, one worker serving the queue.
- A configured worker concurrency, one key for every queue, a key per queue, or a value read in the processor decorator: not needed, since BullMQ's default of one job at a time serves every queue.

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

### A statement and its outbox rows share the use case's transaction, a before-commit callback inserts them once, and an `afterCommit` callback dispatches them from memory

Rule: `effects.md`, Writing; `database.md`; `outbox.md`, Dispatch.

- A non-transactional add after the statement: a crash or a MongoDB failure between the two loses the effect the outbox exists to keep.
- A transaction wrapper on the outbox service that opens the transaction and dispatches after it, with insert-and-dispatch methods on the outbox service for an effect with no business write: the outbox, a kit module, would open a transaction, where the kit opens none.
- A commit listener registered on `DatabaseService` at boot: it is a publish and subscribe mechanism, which this project does not use.
- The use case asking the outbox to dispatch after its transaction, with no ids or by its `tx`: a dispatch with no ids costs one more query in every flow, one by `tx` holds `tx` outside its callback, and a forgotten call leaves the row to the sweep.
- The use case enqueueing or dispatching the ids its transaction added: every `*InTx` method then returns outbox ids through every layer, and a dropped return or a forgotten call leaves the row to the sweep.
- A Prisma client extension in two layers: a second wrapper on every query and a client type derived twice.
- A Prisma client extension handing the callback a `Proxy` of `tx`: every access to `tx` passes a trap, and the method is typed by hand.
- The sweep alone: a one-time code, an email, and a session cache purge wait for the next sweep.
- One `createMany` per add: a transaction whose services add effects apart runs one insert per add, and two parallel adds of one key both insert, the second aborting the transaction on the unique index.
- A service `*InTx` returning its effects to the caller: every `*InTx` then carries effects up through every layer, and a dropped return loses the effect.
- Dropping only the post-commit re-read: the rows still cost one insert per add.

### The queue class is a module's side-effect entry, and enqueues after the commit

Rule: `effects.md`, Effects and Writing; `outbox.md`, Dispatch; `layering.md`, Roles.

- The queue class writing the outbox row itself, on the caller's `tx`: every effect builder then becomes an `*InTx` write, and a fan-out of several effects is several inserts where one `addManyInTx` serves.
- The outbox enqueuing through BullMQ's queue token alone: the enqueue then happens outside the module that owns the job.
- A kit function taking the queue name and returning `<name>QueueClass` as the queue class's token: a function assembling a string where the queue name is already a constant.
- One token constant per queue: the outbox then needs a map from queue name to token, and the kit would know every feature.

### Boot reconciles each queue's job schedulers against the list its queue class declares, in `QueueBase`

Rule: `queue.md`, Enqueuing.

- Removal in `AnalyticQueue` alone: the four other queue classes with recurring jobs keep a renamed or deleted scheduler firing.
- A manual `redis-cli` cleanup per environment: every later rename needs it again, and the job fails on each tick until someone runs it.
- A `schedule([...])` helper each queue class calls from its own `onModuleInit`: a queue whose last scheduler is deleted calls it no more and never reconciles.

### The outbox key is unique per queue and process

Rule: `effects.md`, Effects.

- No unique index: a raced duplicate row has no database guarantee.
- A unique index on the key alone: the guarantee belongs to one queue and process, and keys of different queues may coincide.

### The sweep recovers pending rows and reconciles stale enqueued ones with their job, swept longest ago first

Rule: `outbox.md`, Dispatch.

- Boot drain alone: a row whose `add` failed would stay `pending` until the next restart.
- Retry on the next request: recovery latency would depend on traffic and every request would pay an extra query.
- Dispatch a stale enqueued row again and shift `enqueuedAt`: a job that failed on every attempt runs again once BullMQ's retention drops it.
- Leave a stale enqueued row: its outcome is lost from the history.
- A dispatch-attempt counter with a `failed` stamp: the rotation already frees the head of the batch, and a row only a removed queue or a refused job option produces is not a normal case.

### A hopeless job failure is a `QueueUnrecoverableException` the processor base turns into `UnrecoverableError`

Rule: `queue.md`, Processors; `exceptions.md`, The hierarchy.

- A mapping per processor case: every processor repeats it.
- An `isRecoverable` flag on `QueueException`: one more positional argument at every site.
- Reading `isFatal` as no-retry: `throwUnknownException` makes every unknown error fatal, and those retry.
- A use case throwing BullMQ's `UnrecoverableError`: a use case stays free of BullMQ.

### An import that collides after its route's check fails unrecoverably after notifying the admin

Rule: `use-case.md`, Jobs.

- Finishing with a failed count: the job reports success for work it did not do.
- Failing with no notification: the admin never learns why.
- Re-running the route's check in the job: a second read for a race the contract already names.

### Step state lives in the outbox row

Rule: `notification.md`, Fan-out and send.

- `job.updateData`: the row is the one source every attempt and every dispatch reads, and the recorded decision is part of the history.

### An activity entry is built after its write by whoever runs it, in that write's transaction

Rule: `activity-entry.md`.

- Rows staged in the CLS store and flushed by an interceptor: an entry would be staged in one place and written in another, and an error path would lose it.
- The `ActivityLog` row inserted in the business transaction: the outbox row already commits with the write, and the job keeps the insert off the request path.
- The entry built ahead of every write of its transaction: inside a transaction a failing entry rolls the write back either way, so the order protects nothing.
- Before the write unless the entry needs its result: two orders to read where one serves every flow, since some entries carry what the write returned.

### A user's activity log hides another actor's request details at read

Rule: `activity-log.md`.

- Storing no request log on the affected user's row: the admin's audit view of that row loses it.
- A second response schema for the shared scope: it differs from the canonical one only in a nullable `userAgent`.
- The page mapped row by row in each use case: two use cases repeat one loop.

### A date is stored and passed as ISO 8601 and formatted at render

Rule: `code-style.md`, Dates.

- RFC 2822 strings in `Outbox.data` and `Notification.metadata`: a client reading the notification list would get a display string where every other stored value is ISO 8601.

## Notification jobs

### A step idempotency key is `{process}-{notificationId}`

Rule: `effects.md`, Effects.

- `{step}` kept beside the process: the step repeats the channel the queue already names, so the key carries a segment that tells no two jobs apart.
- The step standing in for the process: the key's uniqueness is per queue and process, so the key names the process the job runs, as every business pattern does.

### A sensitive notification field is sealed at rest, opened at read, and censored before it is sent

Rule: `effects.md`, Payloads; `security.md`, Contact values.

- Plain in `Notification.metadata`: a database reader sees the value, and every sensitive value is sealed wherever it is stored.
- Dropped from the metadata: the in-app text fills its placeholder from the metadata, so the list could not render it.
- The full value in the list: a leaked response or a glance at the screen would give it away.

### A notification setting is one stored row per channel and type, created at registration

Rule: `notification.md`, Recipient.

- A stored override of a default: the materialized rows are the design.

### The push send clears the dead tokens in its transaction

Rule: `notification.md`, Fan-out and send.

- The `cleanupTokens` job: a second job for one `updateMany` on `device` rows, where the step state in the outbox row already keeps a retry from sending twice.

### A device push token is stored plain on its ownership

Rule: `security.md`, Credentials; `notification.md`, Fan-out and send.

- A sealed token with a SHA-256 digest column for the lookup: a push token is no credential, since sending needs the Firebase service account, and Firebase's token guidance asks for stale-token cleanup (`cleanupStaleTokens` runs it) and no encryption.
- The failed tokens kept on the delivery row: a copy no code reads.

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

### An email body is a seeded SES template, upserted by every seed run

Rule: `notification.md`, Fan-out and send; `seeding.md`, Idempotency and reset.

- Rendering in the application and sending raw mail: the job payload would carry a rendered body, where a template keeps it to template data.
- A create-only import, with `--type remove` then `--type seed` to change a template: a send in the gap finds no template.
- `GetTemplate` before the create or the update: two calls per template on every run.

### An async process tells the admin its outcome through one `processResult` kind

Rule: `notify.md`; `notification.md`, Fan-out and send.

- One result kind and template per process: a template per job, and a new job adds a kind.
- A status the template derives from counts: the code would decide success or failure per process.

### The term-policy broadcast is delivered at most once per recipient, its unknown outcome kept on an SES outage

Rule: `notification.md`, Term-policy publish; `exceptions.md`, Who throws.

- At-least-once, releasing the claim on an unknown SES outcome: a duplicate legal notice to every user costs more than one missed mail, which a resend covers.
- Releasing the claim and retrying on an SES outage: a timeout may have delivered, so a retry risks a double send.

### The term-policy module owns `TermPolicyRecipient`, the fan-out, and the `publish` job

Rule: `notification.md`, Term-policy publish.

- The recipient statements, the fan-out, and the publish jobs in the notification module: the term-policy data and flow would sit in another domain, and the use case already sequences both.
