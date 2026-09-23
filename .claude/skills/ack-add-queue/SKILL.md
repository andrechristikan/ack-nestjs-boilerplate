---
name: ack-add-queue
description: >-
  Procedure for adding a BullMQ queue or a job to one: the queue enum member, config
  keys, the factory, registration on the domain module, the queue class, the processor
  and processor service, the processor module, router aggregation, and the boot check.
  Loads when a queue, a job name, a processor, or a queue payload is being written.
user-invocable: false
---

# Add a queue or a job

Invariants: `.claude/rules/queue.md`. Reference implementation: the `workspace` queue
(one job, a scheduler) and the `notificationEmail` queue (many jobs, encrypted fields,
a rate limiter). Framework files live in `src/queues/`; nothing else goes there.

## New queue

1. Name it: add a member to `EnumQueue` (`src/queues/enums/queue.enum.ts:5-10`), camelCase.
2. Config: add `<name>BackoffDelayInMs` to `IConfigQueue` and its value
   (`src/configs/queue.config.ts:10-13,23-26`). `attempts`, `keepLogs`, and the removal
   ages are shared.
3. Factory: `factories/<module>[.<concern>].queue.factory.ts`, `implements
   RegisterQueueOptionsFactory`, reads `queue.job.*` and sets `defaultJobOptions`; no
   `connection` (`src/modules/workspace/factories/workspace.queue.factory.ts:8-42`).
4. Register on the owning domain module: `BullModule.registerQueueAsync({ name:
   EnumQueue.<member>, configKey: QueueConfigKey, useClass: <Module>QueueFactory })` in
   `imports`, `BullModule` first in `exports`
   (`src/modules/workspace/workspace.domain.module.ts:36-37,49-55`). Several queues on
   one module pass several objects to one `registerQueueAsync`
   (`src/modules/notification/notification.domain.module.ts:79-95`).
5. Queue class: `queues/<module>[.<concern>].queue.ts`, `@Injectable()`, holds
   `@InjectQueue(EnumQueue.<member>)` and `ConfigService`; provided and exported by the
   domain module (`src/modules/workspace/queues/workspace.queue.ts:11-50`). One class per
   queue; no header interface.
6. Processor: `processors/<module>[.<concern>].processor.ts`,
   `@QueueProcessor(EnumQueue.<member>, options?)`, `extends QueueProcessorBase`,
   constructor `(private readonly <x>ProcessorService, sentryService: SentryService)`
   with `super(sentryService)`, `protected async handle(job)` switching on `job.name` and
   awaiting one processor-service method per case
   (`src/modules/workspace/processors/workspace.processor.ts:13-35`). Worker options such
   as a limiter go in the decorator's second argument
   (`src/modules/notification/processors/notification.email.processor.ts:36-41`).
7. Processor service: `services/<module>[.<concern>].processor.service.ts`, translates
   the job and calls a domain, returns `IQueueResponse`
   (`src/modules/workspace/services/workspace.processor.service.ts:7-26`). A recurring
   job is scheduled from its `onModuleInit` through the queue class (`:14-16`).
8. Processor module: `<module>.processor.module.ts` providing the processor and its
   service, importing the domain module when the feature is not `@Global()`
   (`src/modules/workspace/workspace.processor.module.ts:6-12`).
9. Aggregate: add the processor module to
   `src/router/processor/router.processor.module.ts:8-11`.

## New job on an existing queue

1. Job name: a member of the module's process enum, `Enum<Module>Process` in
   `<module>/enums/<module>.enum.ts` (`src/modules/workspace/enums/workspace.enum.ts:5-7`;
   `src/modules/notification/enums/notification.enum.ts:5-25`).
2. Payload: `I<Module><Action>QueuePayload` in `<module>/interfaces/<module>.interface.ts`,
   camelCase fields, `Queue` last, `Bulk` before it
   (`src/modules/notification/interfaces/notification.interface.ts:216-224`).
3. Queue-class method: takes domain values, builds the typed payload, calls `add(jobName,
   payload, { priority: EnumQueuePriority.<x>, jobId?, deduplication? })`
   (`src/modules/notification/queues/notification.email.queue.ts:518-539`). A recurring
   job uses `upsertJobScheduler` (`src/modules/workspace/queues/workspace.queue.ts:33-49`).
   A sensitive field is encrypted here with `HelperEncryptionService.aes256Encrypt`, the
   root secret, the module's `*EncryptionPurpose` constant, and the recipient id, and is
   named `encrypted<Field>` (`src/modules/notification/queues/notification.queue.ts:55-62`).
4. Processor case: one `case` in `handle` awaiting the processor-service method
   (`src/modules/notification/processors/notification.email.processor.ts:173-180`). A
   failure no retry fixes is rethrown as `UnrecoverableError` inside `handle` (`:224-230`).
5. Processor-service method: translate `job.data`, call the domain (`src/modules/
   notification/services/notification.email.processor.service.ts:200-211`).
6. Caller: a domain or a processor service injects the queue class and calls the method;
   another feature imports the owning domain module.

## Rename

A queue name, job name, or payload field rename strands jobs already in Redis. Drain the
queue before the rename deploys and say so in the hand-back.

## Verify

```bash
pnpm typecheck
pnpm start:dev        # the worker registers at boot; stop it once the routes mount
pnpm test <module>
```

Specs: the queue class asserts job name, payload with every encrypted field, and options;
a processor service asserts the hand-off; the processor file is excluded from coverage
(`.claude/rules/testing.md`). BullBoard shows the queue at the port in
`docker-compose.yml`.
