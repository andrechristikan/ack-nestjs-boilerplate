---
paths:
    - 'src/common/outbox/**'
    - 'src/common/queue/**'
    - '**/processors/**'
---

# Outbox

Effects, writing, and payloads: `effects.md`.

`src/common/outbox/` is a kit module beside the queue kit; `OutboxRepository` is the kit's one repository, over an infrastructure model. `OutboxModule` registers its own queue, `EnumOutboxQueue.outbox`; `OutboxProcessor` awaits `OutboxService.sweep()`.

## Dispatch

- `dispatch` resolves each row's queue through `ModuleRef.get(getQueueToken(row.queue), { strict: false })`; the outbox injects no queue class of another module.
- Dispatch never throws and never changes the response. A failed enqueue leaves the row `pending`; a Redis connection error warns once per `redis.warnWindowInMs`, any other error warns once, and nothing goes to Sentry.
- The sweep runs every `outbox.sweepIntervalInMs` and once at boot:
    - it re-dispatches up to `outbox.sweepBatch` rows `pending` longer than `outbox.pendingAfterInMs`, oldest first;
    - it reads up to `outbox.sweepBatch` rows `enqueued` longer than `outbox.enqueuedAfterInMs`, oldest first, and reads each one's job by `idempotencyKey`: `completed` stamps the row `completed`, `failed` stamps it `failed` with the job's `failedReason`, any other state leaves it;
    - rows whose job is gone go out with the pending rows in one dispatch.
- `EnumOutboxStatus` is `pending`, `enqueued`, `completed`, `failed`.

## Processing

- `QueueProcessorBase.process` loads the row of a job whose data holds an `outboxId` and passes `row.data` and the id to `handle(job, data, outboxId)`. A job scheduler tick carries no `outboxId`, has no row, and passes `job.data` and `null`. A use case that records step state takes `execute(outboxId, data)`.
- The base stamps the row `completed` with its attempts on return, and `failed` with the message on the last attempt or an `UnrecoverableError`. A retrying job stays `enqueued`. A stamp that fails logs one `warn` and leaves the job's outcome as it is; the row stays `enqueued` for the reconcile.
