---
paths:
    - '**/processors/**'
    - '**/*.processor*.ts'
    - 'src/common/queue/**'
    - '**/queues/**'
    - '**/*.process-*.use-case.ts'
    - 'src/modules/notification/**'
---

# Queues

BullMQ runs on two clients `RedisModule.forRoot()` owns on `redis.queue.url` (`cache.md`); never open another Redis client. Every queue inherits `QueueModule.forRoot()`'s producer client (`RedisQueueClient`, `<app>-<env>:queue`): `enableOfflineQueue: false`, `redis.queue.connectTimeoutInMs`, `redis.queue.maxRetriesPerRequest`, no `keyPrefix`; an enqueue against a down Redis rejects fast. Every worker runs on `RedisQueueWorkerClient` (`<app>-<env>:processor`), which keeps the offline queue on and `maxRetriesPerRequest: null`: a worker waits out an outage.

## Where things live

- `src/common/queue/`, the kit, holds `QueueModule.forRoot()` (`queue.module.ts`), whose one `BullModule.forRootAsync`, no config key, carries the producer client, `prefix`, and the shared `defaultJobOptions`; `@QueueProcessor()`; `QueueWorkerFactory` (`factories/queue.worker.factory.ts`); `QueueBase`, `QueueProcessorBase`, and `QueueWorkerBase` (`bases/`); `QueueException`, `QueueSideEffectFailedException`, `IQueueResponse`; `EnumQueuePriority` and `EnumQueueJobState` (`enums/queue.enum.ts`); no queue.
- The owning feature names each queue in `Enum<Module>Queue` (`<module>.enum.ts`, its value the Redis queue name) and registers them in `<module>.module.ts`: `imports: [BullModule.registerQueueAsync({ name: Enum<Module>Queue.<member>, useClass: <Module>[<Concern>]QueueFactory })]`, one call per module, run once however many modules import it. A queue registered in the kit or a direct `BullModule.registerQueue` is the defect.
- Each queue has its own factory, `src/modules/<module>/factories/<module>[.<concern>].queue.factory.ts`, no shared base, returning `defaultJobOptions` alone, from `queue.job.*`: `attempts`, `keepLogs`, `removeOnCompleteAgeInSeconds`, `removeOnFailAgeInSeconds`, and its own `<name>BackoffDelayInMs` (exponential `backoff`).
- `queues/<module>[.<concern>].queue.ts` is one class per registered queue, extending `QueueBase`. `@InjectQueue`, the BullMQ `Queue` type, `jobId`, `add`, `addBulk`, `upsertJobScheduler` appear under `src/modules/` only there and in `HealthQueueIndicator`, which checks health's own queue (`EnumHealthQueue.health`) has a ready client; no job enters it. `OutboxService` reaches every queue through `ModuleRef.get(getQueueToken(...))` for `addBulk` and `getJob`.

## Enqueuing

A side effect on any queue but the activity-log one is an outbox effect (`outbox.md`). A named queue-class method takes its caller's values, builds the typed payload, and owns the job name, priority, and options. A `jobId` is the `<namespace>.jobId.<name>Pattern` config key (`config.md`), read into a constructor field, filled through `HelperStringService.fillPattern`; a `*JobIdPattern` constant is forbidden. Whoever builds a payload (a queue class, an `<action>Effect` method, `NotificationService.notify`) encrypts a sensitive field (password, link, recipient email, device tokens) with `HelperEncryptionService` (`security.md`, Cryptography), its context the id it belongs to: the recipient's user id, or the invite reference for an invitee with no account. Name it `encrypted<Field>`: job data is readable in BullBoard and `Outbox.data` in the database.

BullMQ ignores a fixed-`jobId` enqueue while a job holding that id exists, until retention ages it out. A queue-class job carries a `jobId` only when a duplicate the normal flow produces collapses into one job; a `jobId` never guards a race (`discipline.md`, Normal use). A job that may legitimately run again for the same subject carries none, or a fresh nonce in it as an operator re-run does.

- No producer calls `getJob`, `getState`, `retry`, or `remove`, the outbox reconcile aside; no caller branches on an `add` result.
- A queue-class side-effect job is added after its transaction commits, never inside it: an earlier `add` leaves a job for a rolled-back write.
- Who injects a queue class: `layering.md`, Roles; a service enqueues only its own module's jobs. A recurring job is scheduled from the queue class's own `onModuleInit`.
- A queue-class method has one caller kind:
    - a request after commit: the protected `QueueBase.addSideEffect` or `addBulkSideEffect`, which resolve on failure (`exceptions.md`, Side effects), awaited unwrapped.
    - a scheduler (`expireStaleInvites`, `cleanupStaleTokens`): `upsertJobScheduler`, which throws.
- A fan-out from one request is one bulk enqueue or one bulk job.
- A sweep whose cutoff is now-relative (`expireStaleInvites`, `cleanupStaleTokens`) is live by design.

## Messages

Paths, the `[<channel>.]` segment, and language: `i18n.md`.

- `IQueueResponse.message` is `setMessage('<module>.queue.[<channel>.]<process>', { properties })`, built by the use case the processor calls.
- A `QueueException` message is built by its thrower: `exceptions.md`, Messages.
- A side-effect `description` is `setMessage('<module>.queue.[<channel>.]error.enqueue<Kind>')`; the queue class injects `MessageService`.

## Processors

`@QueueProcessor(Enum<Module>Queue.<member>, options?)` returns `Processor({ name }, { ...options })`; `QueueWorkerFactory` sets `QueueWorkerBase.connection`, which every worker forces, to `RedisQueueWorkerClient` and assigns `BullModule.workerClass = QueueWorkerBase`. A processor extends `QueueProcessorBase` (`src/common/queue/bases/queue.processor.base.ts`). The base owns `process(job)`: the job-log lines (never `job.data`) and the try/await/catch. Its catch writes the failure line and the one error log, rethrows `QueueException`, `AppBaseException`, or `UnrecoverableError` as is, and throws anything else through the protected `throwUnknownException(error): never`: a `QueueException` with the `queue.error.unknown` message, `isFatal` `true`, and the error as `rawError`. Subclasses implement `handle(job, data, outboxId)`, `data` and `outboxId` read as `outbox.md`, Processing, states: switch on `job.name` against `Enum<Module>[<Channel>]Process` (`<module>.enum.ts`), await one use case's `execute` (never a bare `return this.<x>UseCase.execute()`), map a hopeless failure to `UnrecoverableError`. `default` throws `new QueueException(setMessage('<module>.queue.[<channel>.]error.unknownProcess', { properties: { process: job.name } }), true)` from the processor itself, through `this.messageService`, never a use-case or service method, returning no `IQueueResponse`. A processor injects `MessageService` only to forward it to `super(...)` and build that message. `onFailed` reports to Sentry once, on the last attempt (`attemptsMade >= maxAttempts` or `UnrecoverableError`), skipping a `QueueException` whose `isFatal` is false; retries run either way. Neither processor nor use case adds a logger or log-and-rethrow. A job may run again (retry, BullBoard, operator re-run): its handler is idempotent, deciding the same every attempt.

In `<module>/interfaces/`, the envelope is `I<Module>[<Channel>][Bulk]QueuePayload<T>` and the data is `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted. A queue, job-name, or payload-field rename changes every producer, processor, and payload type at once. Procedure: `.claude/skills/ack-build/references/add-queue.md`.

## Notifications

Channels, producers, recipients, fan-out, and the term-policy broadcast: `notification.md`.
