---
paths:
    - '**/processors/**'
    - '**/*.processor*.ts'
    - 'src/queues/**'
    - '**/queues/**'
    - '**/*.process-*.use-case.ts'
    - 'src/modules/notification/**'
---

# Queues and notifications

BullMQ opens two connections on `redis.queue.url`; never open another Redis client. Every queue inherits `QueueModule.forRoot()`'s producer connection, `<app>-<env>:queue`: `enableOfflineQueue: false`, `queue.redis.connectTimeoutInMs`, `queue.redis.maxRetriesPerRequest`; an enqueue against a down Redis rejects fast. The worker connection, `<app>-<env>:processor`, keeps BullMQ's defaults (offline queue on, `maxRetriesPerRequest: null`): a worker waits out an outage.

## Where things live

- `src/queues/`, the kit, holds `QueueModule.forRoot()` (`queue.module.ts`), whose one `BullModule.forRootAsync`, no config key, carries the producer connection, `prefix`, and the shared `defaultJobOptions`; `@QueueProcessor()`; `QueueBase` and `QueueProcessorBase` (`bases/`); `QueueException`, `QueueSideEffectFailedException`, `IQueueResponse`; `EnumQueuePriority` and `EnumQueueJobState` (`enums/queue.enum.ts`); no feature queue.
- The owning feature names each queue in `Enum<Module>Queue` (`<module>.enum.ts`, its value the Redis queue name) and registers them in `<module>.module.ts`: `imports: [BullModule.registerQueueAsync({ name: Enum<Module>Queue.<member>, useClass: <Module>[<Concern>]QueueFactory })]`, one call per module, run once however many modules import it. A kit registration or a direct `BullModule.registerQueue` is the defect.
- Each queue has its own factory, `src/modules/<module>/factories/<module>[.<concern>].queue.factory.ts`, no shared base, returning `defaultJobOptions` alone, from `queue.job.*`: `attempts`, `keepLogs`, `removeOnCompleteAgeInSeconds`, `removeOnFailAgeInSeconds`, and its own `<name>BackoffDelayInMs` (exponential `backoff`).
- `queues/<module>[.<concern>].queue.ts` is one class per registered queue, extending `QueueBase`. `@InjectQueue`, the BullMQ `Queue` type, `EnumQueuePriority`, `jobId`, `add`, `addBulk`, `upsertJobScheduler` appear under `src/modules/` only there and in `HealthQueueIndicator`, which checks health's own queue (`EnumHealthQueue.health`) has a ready client; no job enters it; `HealthQueueFactory` returns `{}`: the shared config applies.

## Enqueuing

A named queue-class method takes its caller's values, builds the typed payload, and owns the job name, priority, and options. A `jobId` is the `<namespace>.jobId.<name>Pattern` config key (`config.md`), read into a constructor field, filled through `HelperStringService.fillPattern`; a `*JobIdPattern` constant is forbidden. The queue class encrypts a sensitive field (password, link, recipient email, device tokens) with `HelperEncryptionService` (`security.md`, Cryptography), its context the id it belongs to: the recipient's user id, or the invite reference for an invitee with no account. Name it `encrypted<Field>`: job data is readable in BullBoard.

BullMQ ignores a fixed-`jobId` enqueue while a job holding that id exists, until retention ages it out. A job carries a `jobId` only when a duplicate the normal flow produces collapses into one job; a `jobId` never guards a race (`discipline.md`, Simplicity first). A job that may legitimately run again for the same subject carries none, or a fresh nonce in it as an operator re-run does.

- No producer calls `getJob`, `getState`, `retry`, or `remove`; no caller branches on an `add` result.
- An operator-triggered re-run puts a fresh `DatabaseUtil.createId()` nonce in every job id it adds (`NotificationQueue.sendResendPublishTermPolicy`, `notification.jobId.termPolicyResendPattern`); the `TermPolicyRecipient` claim (`claimedAt`, `claimNonce`) keeps delivery at most once per recipient.
- A request adds its side-effect jobs after its transaction commits, never inside it: an earlier `add` leaves a job for a rolled-back write.
- Who injects a queue class: `layering.md`, Roles; a service enqueues only its own module's jobs. A recurring job is scheduled from the queue class's own `onModuleInit`.
- A queue-class method has one caller kind:
    - a request after commit, or a job enqueueing a side effect after its own commit that finds nothing to redo on retry (the lockout job calling `SessionQueue.purgeLogins`): the protected `QueueBase.addSideEffect` or `addBulkSideEffect`, which resolve on failure (`exceptions.md`, Side effects), awaited unwrapped.
    - any other job (fan-out, scheduler, cleanup) or the term-policy resend, whose only work is the enqueue: `add`, `addBulk`, or `upsertJobScheduler`, which throw.
- A fan-out from one request is one bulk enqueue or one bulk job.

The producer decides once, at enqueue: recipients, addresses, channels after preferences, device tokens, a recipient set's bound. It rides in job data as a required non-null field; the processor never re-reads the subject. Every recipient snapshot of an existing user is read before the transaction through `NotificationService.getRecipient`, never in a `Promise.all` with it; a user the write creates is snapshotted from the values it stores (`welcome`). A recipient set too large for a payload carries a fixed bound from a stable column, never the current time. Live by design: step state the job records (`completedSteps`, `encryptedPendingTokens`, `TermPolicyRecipient` `sentAt` and `claimedAt`), a sweep whose cutoff is now-relative (`expireStaleInvites`, `cleanupStaleTokens`), the idempotent `cleanupTokens` purge.

## Messages

Paths, the `[<channel>.]` segment, and language: `i18n.md`.

- `IQueueResponse.message` is `setMessage('<module>.queue.[<channel>.]<process>', { properties })`, built by the use case the processor calls, or by the service returning the job result (`INotificationStepResult.message`).
- A `QueueException` message is built by its thrower: `exceptions.md`, Messages.
- A side-effect `description` is `setMessage('<module>.queue.[<channel>.]error.enqueue<Kind>')`; the queue class injects `MessageService`.

## Processors

`@QueueProcessor(Enum<Module>Queue.<member>, options?)` returns `Processor({ name }, { ...options, connection })`, the worker connection from the `redis.config.ts` and `app.config.ts` default exports, never `process.env`; else a worker takes its queue's connection. A processor extends `QueueProcessorBase` (`src/queues/bases/queue.processor.base.ts`). The base owns `process(job)` (`:38`): the job-log lines (never `job.data`) and the try/await/catch. Its catch writes the failure line and the one error log (`:63`), rethrows `QueueException`, `AppBaseException`, or `UnrecoverableError` as is, and throws anything else through the protected `throwUnknownException(error): never`, called as a statement here and in a processor's catch (`this.throwUnknownException(error);`): a `QueueException` with the `queue.error.unknown` message, `isFatal` `true`, and the error as `rawError`. Subclasses implement `handle(job)` (`:30`): switch on `job.name` against `Enum<Module>[<Channel>]Process` (`<module>.enum.ts`), await one use case's `execute` (never a bare `return this.<x>UseCase.execute()`), map a hopeless failure to `UnrecoverableError`. `default` throws `new QueueException(setMessage('<module>.queue.[<channel>.]error.unknownProcess', { properties: { process: job.name } }), true)` from the processor itself, through `this.messageService`, never a use-case or service method, returning no `IQueueResponse`. A processor injects `MessageService` only to forward it to `super(sentryService, messageService)` and build that message. `onFailed` (`:78`) reports to Sentry once, on the last attempt (`attemptsMade >= maxAttempts` or `UnrecoverableError`), skipping a `QueueException` whose `isFatal` is false; retries run either way. Neither processor nor use case adds a logger or log-and-rethrow. A job may run again (retry, BullBoard, operator re-run): its handler is idempotent, deciding the same every attempt.

In `<module>/interfaces/`, the envelope is `I<Module>[<Channel>][Bulk]QueuePayload<T>` and the data is `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted. A queue, job-name, or payload-field rename changes every producer, processor, and payload type at once. Procedure: `.claude/skills/ack-work/references/add-queue.md`.

## Notifications

Two channels, each with its own queue, processor, and use cases: email (`AwsSESService`) and push (`FirebaseService`); a request never sends inline. `Notification<Concern>Service` writes the job's `Notification` rows in one `NotificationRepository.createMany` and fans out; `NotificationEmail*Service` and `NotificationPush*Service` send. Every notification queue dedupes by a fixed `jobId` alone, never `deduplication`. A `NotificationQueue` job's `jobId` is per subject: a reference, a user id for a once-per-user kind, the event id for a repeat kind; a channel job's is `notification.jobId.stepPattern`. A job runs named steps (`EnumNotificationStep`): `NotificationQueue` generates every row id at enqueue, and a retry skips each step in `completedSteps`. A recipient with no address or token is a no-op. An email body is a seeded SES Handlebars template (`seeding.md`), named by the send with `templateData`. The main queue forwards ciphertext unchanged; each channel service decrypts immediately before its SES or FCM call, an email value into `templateData` only. `FirebaseService.sendMulticast` returns `failureTokens` (invalid, purged by the cleanup job) and `retryTokens` (a `FirebaseRetryableTokenCodes` code, no code, or a rejected chunk), which the push job keeps as `encryptedPendingTokens`: a retry sends only to those; push `sentAt` is stamped once none is pending. The processor rethrows `HelperDecryptFailedException` as `UnrecoverableError`. Procedure: `.claude/skills/ack-work/references/add-notification.md`.
