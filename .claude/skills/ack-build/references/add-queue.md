# Add a queue or a job

Invariants: `.claude/rules/queue.md`. Reference implementation: the `workspace` queue (one job, a scheduler) and the `notificationEmail` queue (many jobs, encrypted fields, a rate limiter). Framework files live in `src/queues/`; nothing else goes there.

## New queue

1. Name it: add a member to `EnumQueue` (`src/queues/enums/queue.enum.ts:5-10`), camelCase.
2. Config: add `<name>BackoffDelayInMs` to `IConfigQueue` and its value (`src/configs/queue.config.ts:10-13,23-26`). `attempts`, `keepLogs`, and the removal ages are shared.
3. Factory: `factories/<module>[.<concern>].queue.factory.ts`, `implements RegisterQueueOptionsFactory`, reads `queue.job.*` and sets `defaultJobOptions`; no `connection` (`src/modules/workspace/factories/workspace.queue.factory.ts:8-42`).
4. Register on the owning domain module: `BullModule.registerQueueAsync({ name: EnumQueue.<member>, configKey: QueueConfigKey, useClass: <Module>QueueFactory })` in `imports`, `BullModule` first in `exports` (`src/modules/workspace/workspace.domain.module.ts:37,50-54`). Several queues on one module pass several objects to one `registerQueueAsync` (`src/modules/notification/notification.domain.module.ts:85-101`).
5. Queue class: `queues/<module>[.<concern>].queue.ts`, `@Injectable()`, holds `@InjectQueue(EnumQueue.<member>)` and `ConfigService`; provided and exported by the domain module (`src/modules/workspace/queues/workspace.queue.ts:11-50`). One class per queue; no header interface.
6. Processor: `processors/<module>[.<concern>].processor.ts`, `@QueueProcessor(EnumQueue.<member>, options?)`, `extends QueueProcessorBase`, constructor `(private readonly <x>ProcessorService, sentryService: SentryService)` with `super(sentryService)`, `protected async handle(job)` switching on `job.name` and awaiting one processor-service method per case (`src/modules/workspace/processors/workspace.processor.ts:13-35`). Worker options such as a limiter go in the decorator's second argument (`src/modules/notification/processors/notification.email.processor.ts:40-45`).
7. Processor service: `services/<module>[.<concern>].processor.service.ts`, translates the job and calls a domain, returns `IQueueResponse` (`src/modules/workspace/services/workspace.processor.service.ts:7-26`). A recurring job is scheduled from its `onModuleInit` through the queue class (`:14-16`).
8. Processor module: `<module>.processor.module.ts` providing the processor and its service, importing the domain module when the feature is not `@Global()` (`src/modules/workspace/workspace.processor.module.ts:6-12`).
9. Aggregate: add the processor module to `src/router/processor/router.processor.module.ts:8-14`.

## New job on an existing queue

1. Job name: a member of the module's process enum, `Enum<Module>Process` in `<module>/enums/<module>.enum.ts` (`src/modules/workspace/enums/workspace.enum.ts:5-7`; `src/modules/notification/enums/notification.enum.ts:5-26`).
2. Payload in `<module>/interfaces/<module>.interface.ts`, camelCase fields: the envelope `I<Module>[<Channel>][Bulk]QueuePayload<T>` carries the data `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted (`src/modules/notification/interfaces/notification.interface.ts:273-276`, `:168-183`).
3. Queue-class method: takes domain values, builds the typed payload, calls `add(jobName, payload, { priority: EnumQueuePriority.<x>, jobId?, deduplication? })`, the id filled from a `<Module>*JobIdPattern` constant through `HelperStringService.fillPattern` (`src/modules/notification/queues/notification.email.queue.ts:800-838`). A fixed `jobId`, the producer's calls on the queue, and an operator re-run follow `.claude/rules/queue.md`, Enqueuing. A recurring job uses `upsertJobScheduler` (`src/modules/workspace/queues/workspace.queue.ts:33-49`). A sensitive field is encrypted here with `HelperEncryptionService.aes256Encrypt`, the root secret, the module's `*EncryptionPurpose` constant, and as context the id the value belongs to; it is named `encrypted<Field>` (`src/modules/notification/queues/notification.queue.ts:70-77`).
4. Processor case: one `case` in `handle` awaiting the processor-service method (`src/modules/notification/processors/notification.email.processor.ts:177-184`). A failure no retry fixes is thrown as `UnrecoverableError` inside `handle`, and every other caught error passes the `instanceof` guard or is wrapped in `AppUnknownException` (`:228-248`).
5. Processor-service method: translate `job.data`, call the domain (`src/modules/notification/services/notification.email.processor.service.ts:203-214`).
6. Caller: a domain or a processor service injects the queue class and calls the method, a one-shot request after its transaction commits (`.claude/rules/queue.md`, Enqueuing); another feature imports the owning domain module.

## Rename

Renaming a queue, a job name, or a payload field changes every producer, processor, and payload type in the same change (`.claude/rules/queue.md`, Processors).

## Verify

```bash
pnpm build   # read its exit code; boot only on 0
timeout 90 node --import ./dist/instrument.js dist/main.js > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log   # the worker registers at boot
pnpm test <module>
```

The boot's `pnpm build` runs `pnpm typecheck`, so a red typecheck shows as a failed build. A failing build is a failed boot; its output is the evidence. Check in the boot log for the `App Name:` block and the `<Module>ProcessorModule dependencies initialized` line, BullMQ logging no line per worker; exit 124 is the expected end of the boot.

Specs: the queue class asserts job name, payload with every encrypted field, and options; a processor service asserts the hand-off; the processor file is excluded from coverage (`.claude/rules/testing.md`). BullBoard shows the queue at the port in `docker-compose.yml`.
