# Add a queue or a job

Invariants: `.claude/rules/queue.md`. Reference implementation: the `workspace` queue (one job, a scheduler) and the `notificationEmail` queue (many jobs, encrypted fields, a rate limiter). Framework files live in `src/queues/`; nothing else goes there.

## New queue

1. Name it: add a member to `EnumQueue` (`src/queues/enums/queue.enum.ts:3-10`), camelCase.
2. Config: add `<name>BackoffDelayInMs` to `IConfigQueue` and its value (`src/configs/queue.config.ts:14-21,35-42`). `attempts`, `keepLogs`, and the removal ages are shared.
3. Factory: `src/queues/factories/queue.<member>.factory.ts`, class `Queue<Member>Factory`, `implements RegisterQueueOptionsFactory`, reads `queue.job.*` and sets `defaultJobOptions`; no `connection` (`src/queues/factories/queue.workspace.factory.ts`).
4. Register in `QueueModule.forRoot()` (`src/queues/queue.module.ts`): one `{ name: EnumQueue.<member>, configKey: QueueConfigKey, useClass: Queue<Member>Factory }` object in its one `BullModule.registerQueueAsync` call; `QueueModule` exports `BullModule`. A feature module registers no queue.
5. Queue class: `queues/<module>[.<concern>].queue.ts`, `@Injectable()`, `extends QueueBase` (`src/queues/bases/queue.base.ts`), constructor `(@InjectQueue(EnumQueue.<member>) protected readonly queue: Queue, protected readonly sentryService: SentryService, private readonly configService: ConfigService)` with `super(queue, sentryService)`, plus `MessageService` when a method calls `addSideEffect`; provided and exported by `<module>.module.ts` (`src/modules/workspace/queues/workspace.queue.ts`). One class per queue; no header interface.
6. Processor: `processors/<module>[.<concern>].processor.ts`, `@QueueProcessor(EnumQueue.<member>, options?)`, `extends QueueProcessorBase`, constructor `(protected readonly sentryService: SentryService, protected readonly messageService: MessageService, private readonly <x>UseCase, ...)` with `super(sentryService, messageService)`, `protected async handle(job)` switching on `job.name` and awaiting one use case's `execute` per case (`src/modules/workspace/processors/workspace.processor.ts`). The `default` case throws `new QueueException(<the error.unknownProcess message>, true)` itself, the message built through `this.messageService`, and returns no `IQueueResponse`; the processor injects `MessageService` only to forward it to `super` and to build that message (`.claude/rules/queue.md`, Processors). Worker options such as a limiter go in the decorator's second argument (`src/modules/notification/processors/notification.email.processor.ts`).
7. Use case per job: `use-cases/<module>[.<concern>].process-<action>.use-case.ts`, class `<Module>[<Concern>]Process<Action>UseCase`, injects `MessageService`, `execute(job)` translates the job and calls a service, returns `IQueueResponse` with `message: this.messageService.setMessage('<module>.queue.[<channel>.]<process>', { properties })`, and throws `new QueueException(this.messageService.setMessage('<module>.queue.[<channel>.]error.<descriptor>', { properties }), true)`, or `(message, true, error)` to carry the cause, the channel segment present only where the module runs several queues (`src/modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case.ts`; `.claude/rules/queue.md`, Messages). A recurring job is scheduled from the queue class's own `onModuleInit`.
8. Use-case module: `<module>.use-case.module.ts` providing the processor and its use cases, importing `<Module>Module` when the feature is not `@Global()` (`src/modules/workspace/workspace.use-case.module.ts`).
9. Aggregate: add the use-case module to `imports` of `src/router/processor/router.processor.module.ts`.
10. Messages: add `queue.[<channel>.]<process>`, `queue.[<channel>.]error.<descriptor>`, `queue.[<channel>.]error.enqueue<Kind>`, and `queue.[<channel>.]error.unknownProcess` (placeholder `{process}`) under the top-level `"queue"` object of `src/languages/<lang>/<module>.json`, every language; a second queue on a module nests its keys under its channel name (`.claude/rules/i18n.md`).

## New job on an existing queue

1. Job name: a member of the module's process enum, `Enum<Module>Process` in `<module>/enums/<module>.enum.ts` (`src/modules/workspace/enums/workspace.enum.ts:5-7`; `src/modules/notification/enums/notification.enum.ts:5-26`).
2. Payload in `<module>/interfaces/<module>.interface.ts`, camelCase fields: the envelope `I<Module>[<Channel>][Bulk]QueuePayload<T>` carries the data `I<Module><Action>Payload`, `I<Module><Action>EncryptedPayload` once a field is encrypted (`src/modules/notification/interfaces/notification.interface.ts:310-313`, `:204-219`).
3. Queue-class method: takes its caller's values, builds the typed payload, enqueues with `{ priority: EnumQueuePriority.<x>, jobId? }`, the id filled from the `<namespace>.jobId.<name>Pattern` config key (`src/configs/<module>.config.ts`), read into a `private readonly` constructor field, through `HelperStringService.fillPattern` (`src/modules/notification/queues/notification.email.queue.ts:660`); a job id pattern constant is forbidden (`.claude/rules/queue.md`, Enqueuing). Whether the job carries a `jobId` at all, the producer's calls on the queue, and an operator re-run follow `.claude/rules/queue.md`, Enqueuing. A recurring job uses `upsertJobScheduler` (`src/modules/workspace/queues/workspace.queue.ts`). A sensitive field is encrypted here with `HelperEncryptionService.aes256Encrypt`, the root secret, the module's `*EncryptionPurpose` constant, and as context the id the value belongs to; it is named `encrypted<Field>` (`src/modules/notification/queues/notification.queue.ts:95-102`).
    - A request calls it after commit, or a job enqueueing a side effect after its own commit that finds nothing to redo on retry (the lockout job calling `SessionQueue.purgeLogins`): `this.addSideEffect(jobName, payload, options, description)`, or `this.addBulkSideEffect(jobs, description)` for a fan-out, `description` being `this.messageService.setMessage('<module>.queue.[<channel>.]error.enqueue<Kind>')`; a failure resolves.
    - Any other job (fan-out, scheduler, cleanup), from a use case or a service a job runs, or the term-policy resend, whose only work is the enqueue: `add`, `addBulk`, or `upsertJobScheduler`; a failure throws.
    - A method serves one of these two caller kinds, never both (`.claude/rules/queue.md`, Enqueuing).
4. Processor case: one `case` in `handle` awaiting the use case's `execute` (`src/modules/notification/processors/notification.email.processor.ts`). A failure no retry fixes is thrown as `UnrecoverableError` inside `handle`. Its catch rethrows `QueueException`, `AppBaseException`, or `UnrecoverableError` as is and throws an unknown error with `this.throwUnknownException(error);`: a `QueueException` with the `queue.error.unknown` message, `isFatal` `true`, and the error as `rawError`.
5. Use case: `execute` translates `job.data` and calls the service (`src/modules/notification/use-cases/notification.email.process-workspace-invite.use-case.ts`); the `IQueueResponse` carries the `<module>.queue.[<channel>.]<process>` message, built as New queue step 7 states, its keys added per step 10.
6. Caller: a service of the queue's own module, or for another module's job a use case, injects the queue class and `await`s the method, a request after its transaction commits and with no wrapper (`.claude/rules/queue.md`, Enqueuing; `.claude/rules/exceptions.md`, Side effects). A caller in another module has its use-case module import the owning `<Module>Module` when it is not `@Global()`; a service never enqueues another module's job.

## Rename

Renaming a queue, a job name, or a payload field changes every producer, processor, and payload type in the same change (`.claude/rules/queue.md`, Processors).

## Verify

```bash
pnpm typecheck
pnpm test <module>
```

Boot in the Docker `apis` container (`.claude/rules/docker.md`, Boot): the worker registers there. Check the boot log for the `App Name:` block and the `<Module>UseCaseModule dependencies initialized` line, BullMQ logging no line per worker.

Specs: the queue class asserts job name, payload with every encrypted field, and options, and for a request-path method that a rejected `add` resolves, logs, and reports; a use case asserts the hand-off and the message path it resolves; the processor holds the `unknownProcess` throw and its file is excluded from coverage (`.claude/rules/testing.md`). BullBoard shows the queue at the port in `docker-compose.yml`.
