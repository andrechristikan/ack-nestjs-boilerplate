# Add a queue or a job

Invariants: `.claude/rules/queue.md`, `.claude/rules/outbox.md`, `.claude/rules/effects.md`. Reference implementation: the `workspace` queue (one job, a scheduler) and the `notificationEmail` queue (many jobs, encrypted fields, a rate limiter). Framework files live in `src/common/queue/`.

## New queue

1. Name it: add a member to `Enum<Module>Queue` in `src/modules/<module>/enums/<module>.enum.ts` (`EnumWorkspaceQueue`); its value is the Redis queue name.
2. Config: add `<name>BackoffDelayInMs` to `IConfigQueue` `job` and its value (`src/configs/queue.config.ts`). `attempts`, `keepLogs`, and the removal ages are shared.
3. Factory: `src/modules/<module>/factories/<module>[.<concern>].queue.factory.ts`, class `<Module>[<Concern>]QueueFactory`, `implements RegisterQueueOptionsFactory` (`src/modules/workspace/factories/workspace.queue.factory.ts`; `.claude/rules/queue.md`, Where things live).
4. Register in the feature's `<module>.module.ts`: `.claude/rules/queue.md`, Where things live (`src/modules/workspace/workspace.module.ts`).
5. Queue class: `queues/<module>[.<concern>].queue.ts`, `@Injectable()`, `extends QueueBase` (`src/common/queue/bases/queue.base.ts`), constructor `(@InjectQueue(Enum<Module>Queue.<member>) protected readonly queue: Queue, private readonly configService: ConfigService)`, `configService` only where it reads a key, with `super(queue)` (`src/modules/workspace/queues/workspace.queue.ts`), provided under its queue's enum value too (`.claude/rules/module-files.md`, Module files).
6. Processor: `processors/<module>[.<concern>].processor.ts`, `@QueueProcessor(Enum<Module>Queue.<member>, options?)`, `extends QueueProcessorBase`, constructor `(private readonly <x>UseCase, ...)` with `super()`, `protected async handle(job, data, outboxId)` switching on `job.name` and awaiting one use case's `execute` per case (`src/modules/workspace/processors/workspace.processor.ts`). `default` and a rejected payload: `.claude/rules/queue.md`, Processors. Worker options such as a limiter go in the decorator's second argument (`src/modules/notification/processors/notification.email.processor.ts`).
7. Use case per job: `use-cases/<module>[.<concern>].process-<action>.use-case.ts`, class `<Module>[<Concern>]Process<Action>UseCase` implementing `IAppUseCase<[<execute params>], IQueueResponse>`, injects `MessageService`, `execute(data)` takes the payload `handle` passes and calls a service, returns `IQueueResponse` with `message: this.messageService.setMessage('<module>.queue.[<channel>.]<process>', { properties })`, and throws `new QueueException(this.messageService.setMessage('<module>.queue.[<channel>.]error.<descriptor>', { properties }), true)`, or `(message, true, error)` to carry the cause, the channel segment present only where the module runs several queues (`src/modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case.ts`; `.claude/rules/queue.md`, Messages).
8. Use-case module: `<module>.use-case.module.ts` providing and exporting the use cases, importing `<Module>Module` unless the feature is `@Global()` (`src/modules/workspace/workspace.use-case.module.ts`).
9. Aggregate: add the processor to `providers` and the use-case module to `imports` of `src/router/processor/router.processor.module.ts`.
10. Messages: `.claude/rules/i18n.md`, the producer table's queue rows, in `src/languages/<lang>/<module>.json`, every language.

## New job on an existing queue

1. Job name: a member of the module's process enum, `Enum<Module>Process` in `<module>/enums/<module>.enum.ts` (`EnumWorkspaceProcess` in `src/modules/workspace/enums/workspace.enum.ts`; `EnumNotificationProcess` in `src/modules/notification/enums/notification.enum.ts`).
2. Payload in `<module>/interfaces/<module>.interface.ts`, camelCase fields, named as `.claude/rules/queue.md`, Processors, gives (`IUserPurgeLoginsPayload`, `src/modules/user/interfaces/user.interface.ts`).
3. Producer. A side effect of a write is an outbox effect: a `<action>Effect` method on the owning module's queue class returns the job's `I<Module><Action>Effect`, declared in the owning module's interface file, with its priority and `idempotencyKey` (`.claude/rules/effects.md`, Effects). A scheduler is a queue-class method instead: `upsertJobScheduler` from the queue class's own `onModuleInit` (`src/modules/workspace/queues/workspace.queue.ts`); a failure throws. Sensitive fields: `.claude/rules/effects.md`, Payloads (`NotificationQueue.notify`).
4. Processor case: one `case` in `handle` awaiting the use case's `execute` (`src/modules/notification/processors/notification.email.processor.ts`). A failure no retry fixes is thrown as `UnrecoverableError` inside `handle`, a rejected payload through `this.throwUnrecoverable(<path>)`.
5. Use case: `execute(data)` translates the payload and calls the service (`src/modules/workspace/use-cases/workspace.process-expire-stale-invites.use-case.ts`); the `IQueueResponse` carries the `<module>.queue.[<channel>.]<process>` message, built as New queue step 7 states, its keys added per step 10.
6. Caller: an effect goes into the caller's transaction (`.claude/rules/effects.md`, Writing); a caller in another module injects the owning queue class (`.claude/rules/layering.md`, Levels).

## Verify

```bash
pnpm typecheck
pnpm test <module>
```

Boot in the Docker `apis` container (`.claude/skills/ack-build/references/boot.md`): the worker registers there. Check the boot log for the `<Module>UseCaseModule dependencies initialized` line, BullMQ logging no line per worker.

Specs: an effect builder asserts queue, name, data, priority, and key; the queue class asserts the scheduler's job name and options; a use case asserts the hand-off and the message path it resolves; the `QueueProcessorBase` spec covers `throwUnknownProcess` and `throwUnrecoverable` (the processor file gets no spec: `.claude/rules/testing.md`, Layout and runs). BullBoard shows the queue at the port in `docker-compose.yml`.
