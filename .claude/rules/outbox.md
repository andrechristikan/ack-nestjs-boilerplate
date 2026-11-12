---
paths:
    - 'src/modules/outbox/**'
    - 'src/common/queue/**'
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - '**/processors/**'
---

# Outbox

A side effect of a write is an `Outbox` row written in the write's transaction. After the commit the row is dispatched to its BullMQ queue. The job carries `{ outboxId }` only; the row keeps the payload, `status` (`EnumOutboxStatus`), `attempts`, and `lastError`, and is never deleted.

`src/modules/outbox/` is the lowest feature module (`layering.md`, Dependency order). `OutboxModule` is `@Global()` and registers its own queue, `EnumOutboxQueue.outbox`; `OutboxProcessor` awaits `OutboxProcessSweepUseCase`, which `OutboxUseCaseModule` provides. Its config is `outbox.*` (`src/configs/outbox.config.ts`); its backoff is `queue.job.outboxBackoffDelayInMs`.

## Effects

- An effect is an `IOutboxEffect`: a union over `(queue, name)` to `data`, each member carrying `priority` (`EnumQueuePriority`) and `idempotencyKey` (`string | null`). The union sits in the outbox module's interface file; a new job adds its member there, the `data` type imported from its feature's payload interface with `import type`.
- The module owning the job builds the effect in a service method `<action>Effect` returning `IOutboxEffect` (`SessionService.purgeLoginsEffect`). No call site writes an effect literal. A service adds the effects its own module's or a lower module's builder returns (`layering.md`, Dependency order).
- `idempotencyKey` is also the BullMQ `jobId`, unique per `(queue, name, idempotencyKey)` (`@@unique`); a business pattern carries the process, because the `jobId` space is per queue. It is filled from a `<namespace>.idempotencyKey.<name>Pattern` config key only when a duplicate the normal flow produces collapses into one job; any other effect passes `null`, and the row id becomes its key.

## Writing and dispatch

- A transaction whose statements add a row opens through `OutboxService.withTransaction(fn, options?)`. It opens `DatabaseService.withTransaction`, collects every id added on that `tx`, and dispatches them after the commit. Who opens it: `database.md`, Transactions.
- Inside it, `OutboxService.addInTx(tx, effect)` and `addManyInTx(tx, effects)` write the rows and return their ids. An effect whose key already has a row, read on `tx` first, inserts nothing and returns that row's id; the unique index answers a race. A service `*InTx` method adds its own rows to the `tx` it joined and returns nothing for them. `addInTx` on a `tx` that `OutboxService.withTransaction` did not open throws.
- A statement whose effect must not be lost shares one transaction with its row, a single statement included. A statement followed by an add outside its transaction is the defect.
- `OutboxService.add(effect)` and `addMany(effects)` insert and dispatch at once, only for an effect with no business write.
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
