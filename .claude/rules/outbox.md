---
paths:
    - 'src/common/outbox/**'
    - 'src/common/queue/**'
    - '**/processors/**'
---

# Outbox

Effects, writing, and payloads: `effects.md`.

`src/common/outbox/` is a kit module beside the queue kit; `OutboxRepository` is the kit's one repository, over an infrastructure model. `OutboxModule` registers its own queue, `EnumOutboxQueue.outbox`; its `OutboxQueue` schedules the sweep and takes no enum-value token, since no row targets the `outbox` queue. `OutboxProcessor` awaits `OutboxService.sweep()`.

## Dispatch

- `dispatch` enqueues each committed row through `QueueBase.enqueue` on the queue class that owns `row.queue`, resolved by `ModuleRef.get(row.queue, { strict: false })`; each queue class is provided under its queue's enum value (`module-files.md`, Module files). The outbox imports no module's queue class. Only `dispatch` calls `enqueue`, and only the sweep calls `getJobState`.
- Dispatch never throws and never changes the response. A failed enqueue leaves the row `pending` and writes one `warn` each time, a connection error included; nothing goes to Sentry.
- The sweep runs every `outbox.sweepIntervalInMs` and once at boot:
    - it stamps `sweptAt` on every row its two reads return before it reconciles and dispatches; a row it cannot move keeps its state, with no attempt counter and no `failed` stamp;
    - it re-dispatches up to `outbox.sweepBatch` rows `pending` longer than `outbox.pendingAfterInMs`, swept longest ago first (`sweptAt`, never-swept first), then oldest;
    - it reads up to `outbox.sweepBatch` rows `enqueued` longer than `outbox.enqueuedAfterInMs`, swept longest ago first, then oldest, and reads each one's job through `QueueBase.getJobState(idempotencyKey)` on its queue class (`queue.md`, Where things live): `completed` stamps the row `completed` with the job's `attemptsMade`, `failed` stamps it `failed` with its `attemptsMade` and `failedReason`, any other state leaves it;
    - rows with no job go out with the pending rows in one dispatch.

## Processing

- `QueueProcessorBase.process` loads the row of a job whose data holds an `outboxId` and passes `row.data` and the id to `handle(job, data, outboxId)`. A job scheduler tick carries no `outboxId`, has no row, and passes `job.data` and `null`. A use case that records step state takes `execute(outboxId, data)`; step state that must commit with a step's writes goes through `OutboxService.updateDataInTx(tx, outboxId, patch)` in that transaction, any other through `updateData`.
- The base stamps the row `completed` with its attempts on return, and `failed` with the message on the last attempt or an `UnrecoverableError`. A retrying job stays `enqueued`. A stamp that fails logs one `warn` and leaves the job's outcome as it is; the row stays `enqueued` for the reconcile.
