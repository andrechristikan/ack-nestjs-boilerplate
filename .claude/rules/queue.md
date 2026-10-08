---
paths:
    - '**/processors/**'
    - '**/*.processor*.ts'
    - 'src/queues/**'
    - 'src/modules/notification/**'
---

# Queues and notifications

Redis `db:1` carries BullMQ (`QUEUE_REDIS_URL`); `db:0` is the cache. BullMQ uses the two connections `QueueModule.forRoot()` registers, producer and processor; never open another Redis client.

## Where things live

- `src/queues/` is the framework layer: `EnumQueue` and `EnumQueuePriority` (`enums/queue.enum.ts`), `QueueConfigKey` and `QueueProcessorConfigKey` (`constants/queue.constant.ts`), `@QueueProcessor()`, `QueueProcessorBase`, `QueueException`, `IQueueResponse`. `QueueModule.forRoot()` in `common.module.ts` holds the two `BullModule.forRootAsync` connections. No processor lives here.
- `<module>.domain.module.ts` registers each owned queue with `BullModule.registerQueueAsync({ name: EnumQueue.<member>, configKey: QueueConfigKey, useClass: <Module>[<Concern>]QueueFactory })` and exports `BullModule`. The factory (`factories/<module>[.<concern>].queue.factory.ts`, implements `RegisterQueueOptionsFactory`) sets `attempts`, `backoff`, `keepLogs`, and removal ages from `queue.*` config and never sets `connection`.
- `queues/<module>[.<concern>].queue.ts` is one class per registered queue holding its `@InjectQueue`, provided and exported by the domain module. The enqueue surface belongs to it alone: `@InjectQueue`, the BullMQ `Queue` type, `EnumQueuePriority`, `jobId`, `deduplication`, `add`, `upsertJobScheduler` appear nowhere else under `src/modules/` except `src/modules/health/indicators/health.queue.indicator.ts`, which reads depth only.
- `processors/<module>[.<concern>].processor.ts` is provided by `<module>.processor.module.ts` beside its processor service; `src/router/processor/router.processor.module.ts` aggregates those modules.

## Enqueuing

A domain or a processor service injects the queue class and calls a named method that takes domain values, builds the typed payload, and passes job name, priority, and options it owns; a controller or HTTP service never enqueues. A `jobId` or `deduplication` id is a `<Module>*JobIdPattern` `{token}` constant in `<module>.constant.ts`, filled in the queue class through `HelperStringService.fillPattern`. A sensitive payload field (a generated password, a verification, reset, invite, or review link) is encrypted by the queue class with `HelperEncryptionService`, the root secret, the module's `*EncryptionPurpose` constant, and the recipient id as context; the field is named `encrypted<Field>`. Job data sits in Redis, readable in BullBoard. One moment, one mechanism: a job or an event, not both.

## Processors

`@QueueProcessor(EnumQueue.<member>, options?)` extends `QueueProcessorBase` (`src/queues/bases/queue.processor.base.ts`), whose constructor takes `SentryService`. The base owns `process(job)` (`:30`): job-log lines (start, input metadata without `job.data`, success with the returned `IQueueResponse`, one failure line) and the try / await / catch. Subclasses implement `protected abstract handle(job): Promise<IQueueResponse>` (`:28`) as a dispatcher: switch on `job.name` against `Enum<Module>[<Channel>]Process` (`<module>.enum.ts`, the job names), await a processor-service method (never a bare `return this.service.x()`), map a hopeless failure to BullMQ's `UnrecoverableError` there. The processor service owns no business rule; it calls a domain and throws only `QueueException` (`exceptions.md`). `onFailed` (`:62`) reports to Sentry once, on the last attempt (`attemptsMade >= maxAttempts` or `UnrecoverableError`), skipping a `QueueException` whose `isFatal` is false; retries run either way. No per-processor logger and no log-and-rethrow. A job may run more than once; a handler is safe to repeat.

In `<module>/interfaces/`, the envelope is `I<Module>[<Channel>][Bulk]QueuePayload<T>` and the data is `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted; fields are camelCase. Renaming a queue, a job name, or a payload field changes every producer, processor, and payload type in the same change. Procedure: `.claude/skills/ack-build/references/add-queue.md`.

## Notifications

Two channels, each with its own queue, processor, and processor service: email through `AwsSESService`, push through `FirebaseService`. A request never sends inline; the domain decides, the queue class enqueues, the processor sends. `Notification<Concern>Domain` writes the `Notification` row and fans out; `NotificationEmail*Domain` and `NotificationPush*Domain` send. A recipient with no address or token is a no-op, not an exception. An email body is a Handlebars template under `src/modules/notification/templates/`, uploaded to SES by the `NotificationTemplate*Domain` classes and seeded (`seeding.md`); a send names the template and passes `templateData`. The main queue forwards ciphertext unchanged; the email domain decrypts immediately before the SES call and the value goes into `templateData` only. A push job carries no secret. `NotificationEmailProcessor` rethrows `HelperDecryptFailedException` as `UnrecoverableError`. Procedure: `.claude/skills/ack-build/references/add-notification.md`.
