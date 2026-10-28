# Add a queue or a job

Invariants: `.claude/rules/queue.md`. Reference implementation: the `workspace` queue (one job, a scheduler) and the `notificationEmail` queue (many jobs, encrypted fields, a rate limiter). Framework files live in `src/queues/`; nothing else goes there.

## New queue

1. Name it: add a member to `EnumQueue` (`src/queues/enums/queue.enum.ts:5-14`), camelCase.
2. Config: add `<name>BackoffDelayInMs` to `IConfigQueue` and its value (`src/configs/queue.config.ts:14-21,35-42`). `attempts`, `keepLogs`, and the removal ages are shared.
3. Factory: `factories/<module>[.<concern>].queue.factory.ts`, `implements RegisterQueueOptionsFactory`, reads `queue.job.*` and sets `defaultJobOptions`; no `connection` (`src/modules/workspace/factories/workspace.queue.factory.ts:8-42`).
4. Register on the owning domain module: `BullModule.registerQueueAsync({ name: EnumQueue.<member>, configKey: QueueConfigKey, useClass: <Module>QueueFactory })` in `imports`, `BullModule` first in `exports` (`src/modules/workspace/workspace.domain.module.ts:37,50-54`). Several queues on one module pass several objects to one `registerQueueAsync` (`src/modules/notification/notification.domain.module.ts:85-101`).
5. Queue class: `queues/<module>[.<concern>].queue.ts`, `@Injectable()`, `extends QueueBase` (`src/queues/bases/queue.base.ts`), constructor `(@InjectQueue(EnumQueue.<member>) protected readonly queue: Queue, protected readonly sentryService: SentryService, private readonly configService: ConfigService)` with `super(queue, sentryService)`, plus `MessageService` when a method calls `addSideEffect`; provided and exported by the domain module (`src/modules/workspace/queues/workspace.queue.ts:10-53`). One class per queue; no header interface.
6. Processor: `processors/<module>[.<concern>].processor.ts`, `@QueueProcessor(EnumQueue.<member>, options?)`, `extends QueueProcessorBase`, constructor `(protected readonly sentryService: SentryService, private readonly <x>ProcessorService)` with `super(sentryService)`, `protected async handle(job)` switching on `job.name` and awaiting one processor-service method per case (`src/modules/workspace/processors/workspace.processor.ts:13-33`). The `default` case throws `new QueueException(<the error.unknownProcess message>, true)`, from a processor-service method or with a message the processor service builds, and returns no `IQueueResponse`; the processor injects no `MessageService` (`.claude/rules/queue.md`, Processors). Worker options such as a limiter go in the decorator's second argument (`src/modules/notification/processors/notification.email.processor.ts:40-45`).
7. Processor service: `services/<module>[.<concern>].processor.service.ts`, injects `MessageService`, translates the job and calls a domain, returns `IQueueResponse` with `message: this.messageService.setMessage('<module>.queue.[<channel>.]<process>', { properties })`, and throws `new QueueException(this.messageService.setMessage('<module>.queue.[<channel>.]error.<descriptor>', { properties }), true)`, or `(message, true, error)` to carry the cause, the channel segment present only where the module runs several queues (`src/modules/workspace/services/workspace.processor.service.ts:7-26`; `.claude/rules/queue.md`, Messages). A recurring job is scheduled from its `onModuleInit` through the queue class (`:14-16`).
8. Processor module: `<module>.processor.module.ts` providing the processor and its service, importing the domain module when the feature is not `@Global()` (`src/modules/workspace/workspace.processor.module.ts:6-12`).
9. Aggregate: add the processor module to `src/router/processor/router.processor.module.ts:16-23`.
10. Messages: add `queue.[<channel>.]<process>`, `queue.[<channel>.]error.<descriptor>`, `queue.[<channel>.]error.enqueue<Kind>`, and `queue.[<channel>.]error.unknownProcess` (placeholder `{process}`) under the top-level `"queue"` object of `src/languages/<lang>/<module>.json`, every language; a second queue on a module nests its keys under its channel name (`.claude/rules/i18n.md`).

## New job on an existing queue

1. Job name: a member of the module's process enum, `Enum<Module>Process` in `<module>/enums/<module>.enum.ts` (`src/modules/workspace/enums/workspace.enum.ts:5-7`; `src/modules/notification/enums/notification.enum.ts:5-26`).
2. Payload in `<module>/interfaces/<module>.interface.ts`, camelCase fields: the envelope `I<Module>[<Channel>][Bulk]QueuePayload<T>` carries the data `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted (`src/modules/notification/interfaces/notification.interface.ts:287-290`, `:181-196`).
3. Queue-class method: takes domain values, builds the typed payload, enqueues with `{ priority: EnumQueuePriority.<x>, jobId? }`, the id filled from the `<namespace>.jobId.<name>Pattern` config key (`src/configs/<module>.config.ts`), read into a `private readonly` constructor field, through `HelperStringService.fillPattern` (`src/modules/notification/queues/notification.email.queue.ts:659`); a job id pattern constant is forbidden (`.claude/rules/queue.md`, Enqueuing). A fixed `jobId`, the producer's calls on the queue, and an operator re-run follow `.claude/rules/queue.md`, Enqueuing. A recurring job uses `upsertJobScheduler` (`src/modules/workspace/queues/workspace.queue.ts:37-53`). A sensitive field is encrypted here with `HelperEncryptionService.aes256Encrypt`, the root secret, the module's `*EncryptionPurpose` constant, and as context the id the value belongs to; it is named `encrypted<Field>` (`src/modules/notification/queues/notification.queue.ts:92-99`).
    - A request calls it after commit: `this.addSideEffect(jobName, payload, options, description)`, or `this.addBulkSideEffect(jobs, description)` for a fan-out, `description` being `this.messageService.setMessage('<module>.queue.[<channel>.]error.enqueue<Kind>')`; a failure resolves.
    - A job calls it (a processor service, or a domain one runs) or the term-policy resend does: `add` / `addBulk`; a failure throws.
    - A method serves one of the two caller kinds, never both (`.claude/rules/queue.md`, Enqueuing).
4. Processor case: one `case` in `handle` awaiting the processor-service method (`src/modules/notification/processors/notification.email.processor.ts:177-184`). A failure no retry fixes is thrown as `UnrecoverableError` inside `handle`, and every other caught error passes the `instanceof` guard or is wrapped in `AppUnknownException` (`:228-248`).
5. Processor-service method: translate `job.data`, call the domain (`src/modules/notification/services/notification.email.processor.service.ts:203-214`); the `IQueueResponse` carries the `<module>.queue.[<channel>.]<process>` message, built as New queue step 7 states, its keys added per step 10.
6. Caller: a domain or a processor service injects the queue class and `await`s the method, a request after its transaction commits and with no wrapper (`.claude/rules/queue.md`, Enqueuing; `.claude/rules/exceptions.md`, Side effects); another feature imports the owning domain module.

## Rename

Renaming a queue, a job name, or a payload field changes every producer, processor, and payload type in the same change (`.claude/rules/queue.md`, Processors).

## Verify

```bash
pnpm build   # read its exit code; boot only on 0
timeout 90 node --import ./dist/instrument.js dist/main.js > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log   # the worker registers at boot
pnpm test <module>
```

The boot's `pnpm build` runs `pnpm typecheck`, so a red typecheck shows as a failed build. A failing build is a failed boot; its output is the evidence. Check in the boot log for the `App Name:` block and the `<Module>ProcessorModule dependencies initialized` line, BullMQ logging no line per worker; exit 124 is the expected end of the boot.

Specs: the queue class asserts job name, payload with every encrypted field, and options, and for a request-path method that a rejected `add` resolves, logs, and reports; a processor service asserts the hand-off, the message path it resolves, and an `unknownProcess` throw it holds; the processor file is excluded from coverage (`.claude/rules/testing.md`). BullBoard shows the queue at the port in `docker-compose.yml`.
