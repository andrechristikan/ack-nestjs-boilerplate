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

BullMQ runs on two clients `RedisModule.forRoot()` owns on `redis.queue.url` (`cache.md`); never open another Redis client. Every queue inherits `QueueModule.forRoot()`'s producer client (`RedisQueueClient`, `<app>-<env>:queue`): `enableOfflineQueue: false`, `redis.queue.connectTimeoutInMs`, `redis.queue.maxRetriesPerRequest`, no `keyPrefix`; an enqueue against a down Redis rejects fast. Every worker runs on `RedisQueueWorkerClient` (`<app>-<env>:processor`), which keeps the offline queue on and `maxRetriesPerRequest: null`.

## Where things live

- `src/common/queue/`, the kit, holds `QueueModule.forRoot()` (`queue.module.ts`), whose one `BullModule.forRootAsync`, no config key, carries the producer client, `prefix`, and the shared `defaultJobOptions`; `@QueueProcessor()` (`decorators/queue.decorator.ts`); `QueueWorkerFactory` (`factories/queue.worker.factory.ts`); `QueueBase`, `QueueProcessorBase`, and `QueueWorkerBase` (`bases/`), `QueueBase` giving a queue class `enqueue(rows)`, one `addBulk` of `{ outboxId }` jobs with `jobId` the row's `idempotencyKey`, and `getJobState(jobId)`, returning `IQueueJobState` (`state`, `attemptsMade`, `failedReason: string | null`), or `null` for no job; `QueueException`, `IQueueResponse`; `EnumQueuePriority` and `EnumQueueJobState` (`enums/queue.enum.ts`).
- The owning feature names each queue in `Enum<Module>Queue` (`<module>.enum.ts`, its value the Redis queue name) and registers them in `<module>.module.ts`: `imports: [BullModule.registerQueueAsync({ name: Enum<Module>Queue.<member>, useClass: <Module>[<Concern>]QueueFactory })]`, one call per module, run once however many modules import it. A queue registered in the kit or a direct `BullModule.registerQueue` is the defect, the cache kit's `cache` and the outbox kit's `outbox` queues aside (`cache.md`, `outbox.md`).
- Each queue has its own factory, `factories/<module>[.<concern>].queue.factory.ts` in the owning module, no shared base, returning `defaultJobOptions` alone, from `queue.job.*`: `attempts`, `keepLogs`, `removeOnCompleteAgeInSeconds`, `removeOnFailAgeInSeconds`, and its own `<name>BackoffDelayInMs` (exponential `backoff`); health's factory returns `{}`, since no job enters its queue.
- `queues/<module>[.<concern>].queue.ts` exists for every queue a job enters: one class, extending `QueueBase`, holding the queue's effect builders and recurring jobs, and inheriting `enqueue` and `getJobState` (`layering.md`, Roles). `@InjectQueue`, the BullMQ `Queue` type, and `upsertJobScheduler` appear under `src/` only there, in `QueueBase`, and in `HealthQueueIndicator`, which checks health's own queue (`EnumHealthQueue.health`) has a ready client; no job enters it. `OutboxService`: `outbox.md`.
- A service or a use case injects a queue class by its class; its token is the enum value itself (`module-files.md`, Module files), built by no function and no per-queue constant, and read by `OutboxService` alone; no `@Inject(<queue enum>)` is written. `@InjectQueue(<queue enum>)` is BullMQ's own token (`BullQueue_<name>`) and yields the BullMQ `Queue`.

## Enqueuing

A side effect is an outbox effect (`effects.md`). Its queue class builds it; after the commit, the outbox dispatch enqueues it through that class (`outbox.md`, Dispatch). A scheduler method owns the job name and options and calls `upsertJobScheduler`, which throws.

- A recurring job (`expireStaleInvites`, `cleanupStaleTokens`) is scheduled from the queue class's own `onModuleInit`.
- A sweep whose cutoff is now-relative (`expireStaleInvites`, `cleanupStaleTokens`) is live by design.
- The `user` queue's daily `purgeExpired` job (`UserQueue`, `user.purgeExpiredCron`) is the one purge of the identity modules' expiring rows: its use case calls each owning service's `purgeExpired`. A new expiring identity model joins it; never a job of its own or a delete on issue or consume (`AuthSocialNonce` aside, `login.md`).
- The `analytic` queue's `AnalyticQueue` upserts one scheduler per `EnumAnalyticSnapshotSignal` member, id `refreshSnapshot:<signal>`, data `{ signal }`: the one recurring job that carries data.

## Messages

Paths, the `[<channel>.]` segment, and language: `i18n.md`.

- Text for an internal reader (a job return value, a job failure, a side-effect description) resolves in `message.defaultLanguage`: `setMessage(path, { properties })` with no `customLanguage`.
- `IQueueResponse.message` is `setMessage('<module>.queue.[<channel>.]<process>', { properties })`, built by the use case the processor calls, or by a kit processor itself.
- A `QueueException` message is built by its thrower: `exceptions.md`, Messages.

## Processors

A processor carries `@QueueProcessor(Enum<Module>Queue.<member>, options?)` and extends `QueueProcessorBase` (`src/common/queue/bases/queue.processor.base.ts`). The base owns `process(job)`: the job-log lines (never `job.data`) and the try/await/catch. Its catch writes the failure line and the one error log, rethrows `QueueException`, `AppBaseException`, or `UnrecoverableError` as is, and throws anything else through the protected `throwUnknownException(error): never`: a `QueueException` with the `queue.error.unknown` message, `isFatal` `true`, and the error as `rawError`. Subclasses implement `handle(job, data, outboxId)`, `data` and `outboxId` read as `outbox.md`, Processing, states: switch on `job.name` against `Enum<Module>[<Channel>]Process` (`<module>.enum.ts`), await one use case's `execute` (never a bare `return this.<x>UseCase.execute()`), map a hopeless failure to `UnrecoverableError`. `default` calls the base's `this.throwUnknownProcess('<module>.queue.[<channel>.]error.unknownProcess', job.name)`, which throws the fatal `QueueException` with property `process`, never a use-case or service method, returning no `IQueueResponse`; a payload the processor rejects (a missing `outboxId`) throws through the base's `this.throwUnrecoverable('<module>.queue.error.<descriptor>')`. A processor's constructor takes its own feature's use cases only and calls `super()`; `QueueProcessorBase` takes `SentryService`, `MessageService`, `CacheService`, and `OutboxService` itself, by property injection (`injectable.md`), and a kit processor declares no constructor and reads the base's `cacheService` or `outboxService`. `onFailed` reports to Sentry once, on the last attempt (`attemptsMade >= maxAttempts` or `UnrecoverableError`), skipping a `QueueException` whose `isFatal` is false; retries run either way. Neither processor nor use case adds a logger or log-and-rethrow. A job may run again (retry, BullBoard, operator re-run): its handler is idempotent, deciding the same every attempt. A job with no per-step state whose handler commits once (the admin import, `UserProcessImportByAdminUseCase`) records its result on its outbox row in that transaction and, on a later run, returns the recorded result and writes nothing.

In `<module>/interfaces/`, the envelope is `I<Module>[<Channel>][Bulk]QueuePayload<T>` and the data is `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted. A queue, job-name, or payload-field rename changes every producer, processor, and payload type at once. Procedure: `.claude/skills/ack-build/references/add-queue.md`.

## Notifications

Channels, producers, recipients, fan-out, and the term-policy broadcast: `notification.md`.
