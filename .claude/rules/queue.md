---
paths:
    - '**/processors/**'
    - '**/*.processor*.ts'
    - 'src/queues/**'
    - 'src/modules/notification/**'
---

# Queues and notifications

BullMQ uses the producer and processor connections `QueueModule.forRoot()` registers in `common.module.ts`; never open another Redis client.

## Where things live

- `src/queues/` is the framework layer: `EnumQueue`, `EnumQueuePriority`, and `EnumQueueJobState` (`enums/queue.enum.ts`; BullMQ's `JobState` is type-only, so a job-state comparison or argument uses this enum, never a string), `QueueConfigKey` and `QueueProcessorConfigKey` (`constants/queue.constant.ts`), `@QueueProcessor()`, `QueueProcessorBase`, `QueueException`, `IQueueResponse`.
- `<module>.domain.module.ts` registers each owned queue with `BullModule.registerQueueAsync({ name: EnumQueue.<member>, configKey: QueueConfigKey, useClass: <Module>[<Concern>]QueueFactory })`. The factory (`factories/<module>[.<concern>].queue.factory.ts`, implements `RegisterQueueOptionsFactory`) sets `attempts`, `backoff`, `keepLogs`, and removal ages from `queue.*` config, and no `connection`.
- `queues/<module>[.<concern>].queue.ts` is one class per registered queue. `@InjectQueue`, the BullMQ `Queue` type, `EnumQueuePriority`, `jobId`, `deduplication`, `add`, `upsertJobScheduler` appear under `src/modules/` only there and in `src/modules/health/indicators/health.queue.indicator.ts`.

## Enqueuing

A named queue-class method takes domain values, builds the typed payload, and passes the job name, priority, and options it owns. A `jobId` or `deduplication` id is a `<Module>*JobIdPattern` `{token}` constant, filled there through `HelperStringService.fillPattern`. The queue class encrypts a sensitive field (generated password; verification, reset, invite, or review link; recipient email; device notification tokens) with `HelperEncryptionService`, the root secret, the module's `*EncryptionPurpose`, and as context the id it belongs to: the recipient's user id, or the invite reference for an invitee with no account (`NotificationEmailQueue.sendWorkspaceInviteUnregistered`). The field is `encrypted<Field>`: job data sits in Redis, readable in BullBoard. A failed `add` answers 500 (`exceptions.md`, The filter chain).

A fixed `jobId` enqueue is a plain `add`: BullMQ ignores it while a job holds that id; age-based retention (`removeOnComplete`, `removeOnFail` from `queue.job.*`, `src/configs/queue.config.ts`) keeps a completed or failed job's id until it ages out.

- No producer calls `getJob`, `getState`, `retry`, or `remove`; no caller branches on an `add` result.
- An operator-triggered re-run puts a fresh `DatabaseUtil.createId()` nonce in every job id it adds (`NotificationQueue.sendResendPublishTermPolicy`, `NotificationTermPolicyResendJobIdPattern`, `NotificationTermPolicyBatchResendJobIdPattern`); the `TermPolicyRecipient` claim (`claimedAt`, `claimNonce`) keeps delivery at most once per recipient.
- A one-shot request adds its job after its transaction commits, never inside it: an `add` before a failed commit or timeout leaves a job, holding its fixed `jobId`, for a rolled-back write. After a failed post-commit `add`, the operator re-run above recovers the subject (term-policy resend).

The producer takes the preflight decision once, at enqueue: recipients, addresses, channels after notification preferences, device tokens, and a recipient set's bound. It rides in job data as a required non-null field; the processor never re-reads the subject (user, device, setting) to decide. It is read before any write not depending on it, so a failed read writes nothing (`forgotPassword`, `src/modules/user/domains/user.password.domain.ts:484`); a snapshot that reads the row the write returns is read after it. A recipient set too large for a payload carries a fixed bound from a stable column, never the current time. Live by design: step state the job records (`completedSteps`, `encryptedPendingTokens`, `TermPolicyRecipient` `sentAt` and `claimedAt`), a scheduler sweep whose cutoff is relative to now (`expireStaleInvites`, `cleanupStaleTokens`), and the idempotent `cleanupTokens` purge.

## Processors

`@QueueProcessor(EnumQueue.<member>, options?)` extends `QueueProcessorBase` (`src/queues/bases/queue.processor.base.ts`), whose constructor takes `SentryService`. The base owns `process(job)` (`:32`): job-log lines (start, input metadata without `job.data`, success with the returned `IQueueResponse`) and the try/await/catch. Its catch writes the one failure line and the one error log (`Queue job failed`, `:57`, the one log-and-rethrow `logging.md` allows), rethrows `QueueException`, `AppBaseException`, or `UnrecoverableError` as is, and wraps anything else in `AppUnknownException`. Subclasses implement `handle(job)` (`:30`) as a dispatcher: switch on `job.name` against `Enum<Module>[<Channel>]Process` (`<module>.enum.ts`, the job names), await a processor-service method (never a bare `return this.service.x()`), map a hopeless failure to BullMQ's `UnrecoverableError` there. The processor service throws only `QueueException` (`exceptions.md`). `onFailed` (`:72`) reports to Sentry once, on the last attempt (`attemptsMade >= maxAttempts` or `UnrecoverableError`), skipping a `QueueException` whose `isFatal` is false; retries run either way. A processor or processor service adds no logger or log-and-rethrow. A job may run more than once (automatic, BullBoard, or operator re-run); its handler is safe to repeat and reaches the same decision every attempt.

In `<module>/interfaces/`, the envelope is `I<Module>[<Channel>][Bulk]QueuePayload<T>` and the data is `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted. Renaming a queue, a job name, or a payload field changes every producer, processor, and payload type in the same change. Procedure: `.claude/skills/ack-build/references/add-queue.md`.

## Notifications

Two channels, each with its own queue, processor, and processor service: email through `AwsSESService`, push through `FirebaseService`. A request never sends inline. `Notification<Concern>Domain` writes the job's `Notification` rows in one `NotificationRepository.createMany` and fans out; `NotificationEmail*Domain` and `NotificationPush*Domain` send. A notification job runs named steps (`EnumNotificationStep`): `NotificationQueue` generates every row id at enqueue, a retry skips each step recorded in `completedSteps`, and a channel job's `jobId` is `NotificationStepJobIdPattern`. A recipient with no address or token is a no-op, not an exception. An email body is a Handlebars template under `src/modules/notification/templates/`, uploaded to SES by `NotificationTemplate*Domain` and seeded (`seeding.md`); a send names the template and passes `templateData`. The main queue forwards ciphertext unchanged; each channel domain decrypts immediately before its SES or FCM call, an email value into `templateData` only. `FirebaseService.sendMulticast` returns `failureTokens` (invalid tokens, purged by the cleanup job) and `retryTokens` (a `FirebaseRetryableTokenCodes` code, a token failure with no code, or a rejected chunk); any other code, a payload error included, counts in `failureCount` only, neither purged nor retried; the push job keeps them as `encryptedPendingTokens`, a retry sends only to those, and the push `sentAt` is stamped only once none is pending. The processor rethrows `HelperDecryptFailedException` as `UnrecoverableError`. Procedure: `.claude/skills/ack-build/references/add-notification.md`.
