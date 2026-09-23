---
paths:
  - "**/processors/**"
  - "**/*.processor*.ts"
  - "src/queues/**"
  - "src/modules/notification/**"
---

# Queues and notifications

Redis `db:1` carries BullMQ (`QUEUE_REDIS_URL`); `db:0` is the cache. One connection per
backing service; never open a second Redis client.

## Where things live

- `src/queues/` is the framework layer: `EnumQueue` and `EnumQueuePriority`
  (`enums/queue.enum.ts`), `QueueConfigKey` and `QueueProcessorConfigKey`
  (`constants/queue.constant.ts`), `@QueueProcessor()`, `QueueProcessorBase`,
  `QueueException`, `IQueueResponse`. `QueueModule.forRoot()` in `common.module.ts` holds the
  two `BullModule.forRootAsync` connections. No processor lives here.
- `<module>.domain.module.ts` registers each owned queue with
  `BullModule.registerQueueAsync({ name: EnumQueue.<member>, configKey: QueueConfigKey,
  useClass: <Module>[<Concern>]QueueFactory })` and exports `BullModule`. The factory
  (`factories/<module>[.<concern>].queue.factory.ts`, implements
  `RegisterQueueOptionsFactory`) sets `attempts`, `backoff`, `keepLogs`, and removal ages from
  `queue.*` config and never sets `connection`.
- `queues/<module>[.<concern>].queue.ts` is one class per registered queue holding its
  `@InjectQueue`, provided and exported by the domain module. The enqueue surface belongs to
  it alone: `@InjectQueue`, the BullMQ `Queue` type, `EnumQueuePriority`, `jobId`,
  `deduplication`, `add`, `upsertJobScheduler` appear nowhere else under `src/modules/` except
  `src/modules/health/indicators/health.queue.indicator.ts`, which reads depth only.
- `processors/<module>.<concern>.processor.ts` is provided by `<module>.processor.module.ts`
  beside its processor service; `src/router/processor/router.processor.module.ts` aggregates
  those modules.

## Enqueuing

A domain or a processor service injects the queue class and calls a named method that takes
domain values, builds the typed payload, and passes job name, priority, and options it owns.
A controller or HTTP service never enqueues. A sensitive payload field (a generated password,
a verification, reset, invite, or review link) is encrypted by the queue class with
`HelperEncryptionService`, the root secret, the module's `*EncryptionPurpose` constant, and
the recipient id as context; the field is named `encrypted<Field>`. Job data sits in Redis
and is readable in BullBoard. One moment, one mechanism: a job or an event, not both.

## Processors

`@QueueProcessor(EnumQueue.<member>, options?)` extends `QueueProcessorBase`
(`src/queues/bases/queue.processor.base.ts`), whose constructor takes `SentryService`. The
base owns `process(job)` (`:30`): job-log lines (start, input metadata without `job.data`,
success with the returned `IQueueResponse`, one failure line) and the try / await / catch.
Subclasses implement `protected abstract handle(job): Promise<IQueueResponse>` (`:28`) as a
dispatcher: switch on `job.name`, await a processor-service method (never a bare `return
this.service.x()`), map a hopeless failure to BullMQ's `UnrecoverableError` there. The
processor service owns no business rule; it calls a domain. `onFailed` (`:61`) reports to
Sentry once, only when fatal: final attempt (`attemptsMade >= maxAttempts`),
`UnrecoverableError`, or `QueueException.isFatal`. No per-processor logger and no
log-and-rethrow. A job may run more than once; a handler is safe to repeat.

Payloads are `I<Module><Action>QueuePayload` in `<module>/interfaces/`, camelCase fields,
kind word last, `Bulk` before the kind. Renaming a queue, a job name, or a payload field
strands in-flight jobs: drain the queue before deploying and say so in the hand-back.
Procedure: the `ack-add-queue` skill.

## Notifications

Two channels, each with its own queue, processor, and processor service: email through
`AwsSESService`, push through `FirebaseService`. A request never sends inline; the domain
decides, the queue class enqueues, the processor sends. `Notification<Concern>Domain` writes
the `Notification` row and fans out; `NotificationEmail*Domain` and `NotificationPush*Domain`
send. A recipient with no address or token is a no-op, not an exception. An email body is a
Handlebars template under `src/modules/notification/templates/`, uploaded to SES by the
`NotificationTemplate*Domain` classes and seeded (`seeding.md`); a send names the template and
passes `templateData`. The main queue forwards ciphertext unchanged; the email domain
decrypts immediately before the SES call and the value goes into `templateData` only. A push
job carries no secret. `NotificationEmailProcessor` rethrows `HelperDecryptFailedException`
as `UnrecoverableError`. Procedure: the `ack-add-notification` skill.
