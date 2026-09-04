# Queues — BullMQ

Detail in `docs/queue.md`. Redis `db:1` carries BullMQ; `db:0` carries the cache (`rules/cache.md`). **One Redis connection, shared** — never open a second.

## Where things live

- **Framework layer** — `src/queues/`: `EnumQueue` + `EnumQueuePriority`, `@QueueProcessor()` decorator, `QueueProcessorBase`, `QueueException`, `IQueueResponse`. It holds no module that provides a processor.
- **`queue.register.module.ts`** — `@Global()`; every `BullModule.registerQueue` and per-queue job default lives here, nowhere else.
- **`<feature>.processor.module.ts`** — the feature's own module, providing its processor classes beside the `*.processor.service.ts` they dispatch to, and importing `<Feature>Module` for the domain services behind them (`rules/nest-wiring.md`).
- **`src/router/processor/router.processor.module.ts`** — imports every `<Feature>ProcessorModule` and provides nothing itself. Do not invent a second aggregation site (`rules/router.md`).
- **Processor FILES live in their owning feature module** (`<module>/processors/<module>.<concern>.processor.ts`), and so does their registration. A `processors/` folder under `src/queues/` is drift.

## Writing a processor

```ts
@QueueProcessor(EnumQueue.notificationEmail, { limiter: { … } })
export class NotificationEmailProcessor extends QueueProcessorBase {
    constructor(private readonly notificationEmailProcessorService: NotificationEmailProcessorService) {
        super();
    }

    async process(job: Job): Promise<IQueueResponse> { … }
}
```

- Always `extends QueueProcessorBase` — the base owns the `failed` hook that reports to Sentry once, on the last attempt only, and only when the error is fatal. A processor extending `WorkerHost` directly loses that and double-reports across retries.
- Always return `IQueueResponse`. An ad-hoc `{ ok: false }` or `{ applied: true }` shape breaks the contract the base and the board rely on.
- `process()` dispatches by `job.name` to a handler; the handler's real work belongs in a `*.processor.service.ts`, not inline in the switch. A processor is a dispatcher, the same way a controller is.
- **The processor service owns no business rule.** It translates the payload and calls a domain service, exactly as an HTTP service translates a DTO (`rules/architecture.md`). A rule written here is a rule the HTTP path does not apply.
- Mark a non-fatal failure with `QueueException`'s fatal flag so a retryable error does not page anyone.

## Payloads

- Payload interfaces are `I<Module><Action>Payload`, in `<module>/interfaces/<module>.interface.ts`. The kind word goes LAST.
- Fields are camelCase, like everything else on a wire here.
- **Rename freely, but drain first.** A queue name, job name, or payload field rename is safe to make and unsafe to deploy blind: jobs already sitting in Redis survive the deploy and reach a processor that no longer matches them. **Drain the queue before deploying the rename**, and say so in your hand-back (`rules/naming.md`).

## Enqueuing

- A service enqueues through the injected BullMQ queue; a controller never does.
- Priority comes from `EnumQueuePriority` (`high` / `medium` / `low`), not a raw number.
- One moment, one mechanism: do not enqueue a job AND emit an event for the same thing. Pick the one that matches whether the caller needs the result.

## Retries make a job repeatable

`queue.register.module.ts` sets `attempts` plus an exponential `backoff` per queue from config,
so a processor's work runs again on failure. A handler that is not safe to repeat needs the
repeat to be harmless — a conditional write, an upsert, a state check (`rules/concurrency.md`).

`QueueProcessorBase` reports to Sentry once, on the LAST attempt only, and only when the error
is fatal. A processor extending `WorkerHost` directly loses that and double-reports across
retries (`rules/logging.md`).
