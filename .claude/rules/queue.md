---
paths:
    - '**/processors/**'
    - '**/*.processor*.ts'
    - 'src/queues/**'
    - 'src/modules/notification/**'
---

# Queues and notifications

BullMQ uses two connections; never open another Redis client. The producer connection (`QueueModule.forRoot()`, `src/queues/queue.module.ts`) sets `enableOfflineQueue: false`, `queue.redis.connectTimeoutInMs`, and `queue.redis.maxRetriesPerRequest`: an enqueue against a down Redis rejects fast. Each worker connection (`@QueueProcessor()`, `src/queues/decorators/queue.decorator.ts`, from `QUEUE_REDIS_URL`, named `<app>-<env>:processor`) keeps BullMQ's defaults (offline queue on, `maxRetriesPerRequest: null`): a worker waits out an outage.

## Where things live

- `src/queues/` is the framework layer: the enums (`enums/queue.enum.ts`; a job state is `EnumQueueJobState`, never a string), `QueueConfigKey`, `@QueueProcessor()`, `QueueBase` and `QueueProcessorBase` (`bases/`), `QueueException`, `QueueSideEffectFailedException`, `IQueueResponse`.
- `<module>.domain.module.ts` registers each owned queue with `BullModule.registerQueueAsync({ name: EnumQueue.<member>, configKey: QueueConfigKey, useClass: <Module>[<Concern>]QueueFactory })`; a direct `BullModule.registerQueue` is the defect.
- Each queue has its own factory (`factories/<module>[.<concern>].queue.factory.ts`), one body for all, no shared base, no `connection`: `defaultJobOptions` from `queue.job.*`: `attempts`, `keepLogs`, `removeOnCompleteAgeInSeconds`, `removeOnFailAgeInSeconds`, and the queue's own `<name>BackoffDelayInMs` (exponential `backoff`).
- `queues/<module>[.<concern>].queue.ts` is one class per registered queue, extending `QueueBase` (`super` forwarding: `code-style.md`, Constructors and fields). `@InjectQueue`, the BullMQ `Queue` type, `EnumQueuePriority`, `jobId`, `add`, `addBulk`, `upsertJobScheduler` appear under `src/modules/` only there and in `HealthQueueIndicator`.

## Enqueuing

A named queue-class method takes domain values, builds the typed payload, and owns the job name, priority, and options. A `jobId` is the `<namespace>.jobId.<name>Pattern` config key (`config.md`), read once into a constructor field and filled there through `HelperStringService.fillPattern`; a `*JobIdPattern` constant is forbidden. The queue class encrypts a sensitive field (generated password, a link, recipient email, device tokens) with `HelperEncryptionService` (`security.md`, Cryptography), its context the id it belongs to: the recipient's user id, or the invite reference for an invitee with no account (`NotificationEmailQueue.sendWorkspaceInviteUnregistered`). Name it `encrypted<Field>`: job data sits in Redis, readable in BullBoard.

BullMQ ignores a fixed-`jobId` enqueue while a job holding that id exists, until retention ages it out.

- No producer calls `getJob`, `getState`, `retry`, or `remove`; no caller branches on an `add` result.
- An operator-triggered re-run puts a fresh `DatabaseUtil.createId()` nonce in every job id it adds (`NotificationQueue.sendResendPublishTermPolicy`, `notification.jobId.termPolicyResendPattern`); the `TermPolicyRecipient` claim (`claimedAt`, `claimNonce`) keeps delivery at most once per recipient.
- A request adds its side-effect jobs after its transaction commits, never inside it: an earlier `add` leaves a job for a rolled-back write.
- A queue-class method has one caller kind:
    - a request after commit: the protected `QueueBase.addSideEffect` or `addBulkSideEffect`, which resolve on failure (`exceptions.md`, Side effects), awaited unwrapped.
    - a job (fan-out, scheduler, cleanup) or the term-policy resend, whose only work is the enqueue: `add`, `addBulk`, or `upsertJobScheduler`, which throw.
- A fan-out from one request (onboarding import) is one bulk enqueue or one bulk job.

The producer decides once, at enqueue: recipients, addresses, channels after preferences, device tokens, a recipient set's bound. It rides in job data as a required non-null field; the processor never re-reads the subject (user, device, setting). Every recipient snapshot is read before the transaction (`security.md`, Session invalidation); a user the write creates is snapshotted from the values it stores (`welcome`). A recipient set too large for a payload carries a fixed bound from a stable column, never the current time. Live by design: step state the job records (`completedSteps`, `encryptedPendingTokens`, `TermPolicyRecipient` `sentAt` and `claimedAt`), a sweep whose cutoff is now-relative (`expireStaleInvites`, `cleanupStaleTokens`), the idempotent `cleanupTokens` purge.

## Messages

Paths, the `[<channel>.]` segment, and language: `i18n.md`.

- `IQueueResponse.message` is `setMessage('<module>.queue.[<channel>.]<process>', { properties })`, built by the processor service, or by the domain returning the job result (`INotificationStepResult.message`).
- A `QueueException` message is built by its thrower: `exceptions.md`, Messages.
- A side-effect `description` is `setMessage('<module>.queue.[<channel>.]error.enqueue<Kind>')`; the queue class injects `MessageService`.

## Processors

`@QueueProcessor(EnumQueue.<member>, options?)` extends `QueueProcessorBase` (`src/queues/bases/queue.processor.base.ts`). The base owns `process(job)` (`:32`): the job-log lines (never `job.data`) and the try/await/catch. Its catch writes the failure line and the one error log (`:57`, the log-and-rethrow `logging.md` allows), rethrows `QueueException`, `AppBaseException`, or `UnrecoverableError` as is, and wraps anything else in `AppUnknownException`. Subclasses implement `handle(job)` (`:30`): switch on `job.name` against `Enum<Module>[<Channel>]Process` (`<module>.enum.ts`), await a processor-service method (never a bare `return this.service.x()`), map a hopeless failure to `UnrecoverableError`. `default` never returns an `IQueueResponse`; it throws `new QueueException(setMessage('<module>.queue.[<channel>.]error.unknownProcess', { properties: { process: job.name } }), true)` from the processor-service method it awaits or, where none fits, from the processor with a message the processor service builds; the processor injects no `MessageService`. The processor service throws only `QueueException` (`exceptions.md`). `onFailed` (`:72`) reports to Sentry once, on the last attempt (`attemptsMade >= maxAttempts` or `UnrecoverableError`), skipping a `QueueException` whose `isFatal` is false; retries run either way. Neither processor nor processor service adds a logger or log-and-rethrow. A job may run again (retry, BullBoard, operator re-run); its handler is idempotent and decides the same every attempt.

In `<module>/interfaces/`, the envelope is `I<Module>[<Channel>][Bulk]QueuePayload<T>` and the data is `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted. A queue, job-name, or payload-field rename changes every producer, processor, and payload type at once. Procedure: `.claude/skills/ack-build/references/add-queue.md`.

## Notifications

Two channels, each with its own queue, processor, processor service: email (`AwsSESService`) and push (`FirebaseService`); a request never sends inline. `Notification<Concern>Domain` writes the job's `Notification` rows in one `NotificationRepository.createMany` and fans out; `NotificationEmail*Domain` and `NotificationPush*Domain` send. Every notification queue dedupes by a fixed `jobId` alone, never `deduplication`. A `NotificationQueue` job's `jobId` is per subject: a reference, a user id for a once-per-user kind, the event id for a repeat kind; a channel job's is `notification.jobId.stepPattern`. A job runs named steps (`EnumNotificationStep`): `NotificationQueue` generates every row id at enqueue, and a retry skips each step in `completedSteps`. A recipient with no address or token is a no-op. An email body is a seeded SES Handlebars template (`seeding.md`), named by the send with `templateData`. The main queue forwards ciphertext unchanged; each channel domain decrypts immediately before its SES or FCM call, an email value into `templateData` only. `FirebaseService.sendMulticast` returns `failureTokens` (invalid, purged by the cleanup job) and `retryTokens` (a `FirebaseRetryableTokenCodes` code, no code, or a rejected chunk), which the push job keeps as `encryptedPendingTokens`: a retry sends only to those; push `sentAt` is stamped once none is pending. The processor rethrows `HelperDecryptFailedException` as `UnrecoverableError`. Procedure: `.claude/skills/ack-build/references/add-notification.md`.
