# Queues — BullMQ

Redis `db:1` carries BullMQ; `db:0` carries the cache (`rules/cache.md`). **One Redis
connection, shared** — never open a second. Flow narrative: `docs/queue.md` — explorer or
planner.

## Where things live

- **Framework layer** — `src/queues/`: `EnumQueue` + `EnumQueuePriority`, `@QueueProcessor()` decorator, `QueueProcessorBase`, `QueueException`, `IQueueResponse`. It holds no module that provides a processor.
- **`queue.module.ts`** — `QueueModule.forRoot()` in `common.module.ts`. Holds the two
  `BullModule.forRootAsync` connections (`QueueConfigKey` producer, `QueueProcessorConfigKey`
  worker). A feature never calls `forRoot` and never passes `connection` to
  `registerQueueAsync`.
- **`<feature>.domain.module.ts`** — `BullModule.registerQueueAsync({ name: EnumQueue.<member>,
  configKey: QueueConfigKey, useClass: <Feature>[<Concern>]QueueFactory })` in `imports`, and
  `BullModule` in `exports`. Queue tokens are the `name` values. The factory lives at
  `factories/<module>[.<concern>].queue.factory.ts` and implements `RegisterQueueOptionsFactory`;
  it sets job defaults and never sets `connection`.
- **`<module>/queues/<module>[.<concern>].queue.ts`** — one `@Injectable()` queue class per registered queue, holding the `@InjectQueue` for it. Provided and exported by `<feature>.domain.module.ts`. No header interface — unlike a repository (`rules/architecture.md`).
- **`<feature>.processor.module.ts`** — the feature's own module, providing its processor classes beside the `*.processor.service.ts` they dispatch to. It imports `<Feature>DomainModule` when that feature is not `@Global()` (`rules/nest-wiring.md`).
- **`src/router/processor/router.processor.module.ts`** — imports every `<Feature>ProcessorModule` and provides nothing itself. Do not invent a second aggregation site (`rules/router.md`).
- **Processor FILES live in their owning feature module** (`<module>/processors/<module>.<concern>.processor.ts`), and so does their registration. A `processors/` folder under `src/queues/` is drift.

## Writing a processor

```ts
@QueueProcessor(EnumQueue.notificationEmail, { limiter: { … } })
export class NotificationEmailProcessor extends QueueProcessorBase {
    constructor(
        private readonly notificationEmailProcessorService: NotificationEmailProcessorService,
        sentryService: SentryService
    ) {
        super(sentryService);
    }

    async process(job: Job): Promise<IQueueResponse> { … }
}
```

- Always `extends QueueProcessorBase` — the base owns the `failed` hook that reports through `SentryService` once, and only when the error is fatal. Its constructor takes `SentryService`, so every processor declares a `sentryService: SentryService` parameter (no access modifier, value import) and passes it to `super(sentryService)`. A processor extending `WorkerHost` directly loses the hook and double-reports across retries.
- Always return `IQueueResponse`. An ad-hoc `{ ok: false }` or `{ applied: true }` shape breaks the contract the base and the board rely on.
- `process()` dispatches by `job.name` to a handler; the handler's real work belongs in a `*.processor.service.ts`, not inline in the switch. A processor is a dispatcher, the same way a controller is.
- **The processor service owns no business rule.** It translates the payload and calls a domain, exactly as an HTTP service translates a DTO (`rules/architecture.md`). A rule written here is a rule the HTTP path does not apply.
- Mark a non-fatal failure with `QueueException`'s fatal flag so a retryable error does not page anyone.
- **A failure that no retry can fix is thrown as BullMQ's `UnrecoverableError`**, so BullMQ stops retrying and the base reports it at once. `NotificationEmailProcessor` maps `HelperDecryptFailedException` to it: a payload that does not decrypt never will.
- **A handler call inside `try` is awaited into a `const` and returned.** A bare `return this.service.x()` hands back the promise before it settles, so its rejection skips the `catch` and any mapping written there never runs (`rules/code-style.md`).

## Payloads

- Payload interfaces are `I<Module><Action>Payload`, in `<module>/interfaces/<module>.interface.ts`. The kind word goes LAST. The envelope a job actually carries as `job.data` names its kind `Queue` — `INotificationEmailQueuePayload` — while the content shape it wraps keeps its own descriptive suffix (`rules/notification.md`).
- Fields are camelCase, like everything else on a wire here.
- **Rename freely, but drain first.** A queue name, job name, or payload field rename is safe to make and unsafe to deploy blind: jobs already sitting in Redis survive the deploy and reach a processor that no longer matches them. **Drain the queue before deploying the rename**, and say so in your hand-back (`rules/naming.md`).

## Enqueuing

- **Every enqueue happens inside a queue class** — `<module>/queues/<module>[.<concern>].queue.ts`, one per registered queue. The ENQUEUE surface belongs to that class alone: `@InjectQueue`, the BullMQ `Queue` type, `EnumQueuePriority`, `jobId`, `deduplication`, `add` and `upsertJobScheduler` appear there and nowhere else under `src/modules/`, the health indicator's read-only `@InjectQueue` aside. `EnumQueue` and the job-name enum each reach one step further, in the processor's own shapes: `@QueueProcessor(EnumQueue.<member>)` names the queue a processor consumes, and the `job.name` switch matches the job-name members the queue class enqueued.
- **The queue class is thick.** Its method takes domain arguments, builds the typed payload, and calls `add` or `upsertJobScheduler` with the job name, priority and options it owns. A caller passes domain values, never a job option.
- **A domain or a processor service injects the queue class and calls a named method**, from its own feature or from another one, importing `<Feature>DomainModule` where the owner is not `@Global()` (`rules/cross-module.md`). **A controller and an HTTP service never enqueue** — whether to enqueue is a business rule, and the domain is the layer that owns it (`rules/architecture.md`).
- The queue class reads `ConfigService` for job mechanics: a cron pattern, a timezone, a deduplication TTL (`rules/config.md`).
- **A sensitive payload field is encrypted by the queue class before `add`** — a generated password, a verification, reset, invite or review link. The job data sits in Redis for the retention window and is readable in BullBoard, so plaintext never reaches it. The consumer that renders the value decrypts it; a job for a channel that does not need the value (push) carries none (`rules/notification.md`).
- Priority comes from `EnumQueuePriority` (`high` / `medium` / `low`), not a raw number.
- **A queue injected to READ depth, counts or health belongs to a health indicator**, which enqueues nothing (`src/modules/health/indicators/health.queue.indicator.ts`).
- One moment, one mechanism: do not enqueue a job AND emit an event for the same thing. Pick the one that matches whether the caller needs the result.

## Retries make a job repeatable

The owning queue factory's `createRegisterQueueOptions` sets `attempts` plus an exponential `backoff` per queue from config,
so a processor's work runs again on failure. A handler that is not safe to repeat needs the
repeat to be harmless — a conditional write, an upsert, a state check (`rules/concurrency.md`).

`QueueProcessorBase` reports through `SentryService` once, and only when the error is fatal:
on the final attempt — `job.attemptsMade` already counts the failed attempt when BullMQ fires
`failed`, so the check is `attemptsMade >= attempts` — or immediately for an
`UnrecoverableError`. A processor extending `WorkerHost` directly loses that and
double-reports across retries (`rules/logging.md`).
