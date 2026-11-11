---
paths:
    - 'src/queues/**'
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - '**/processors/**'
---

# Outbox

A side effect of a write is an `Outbox` row written in the write's transaction. After the commit the row is dispatched to its BullMQ queue. The job carries `{ outboxId }` only; the row keeps the payload, `status` (`EnumOutboxStatus`), `attempts`, and `lastError`, and is never deleted.

## Effects

- An effect is an `IOutboxEffect`: a union over `(queue, name)` to `data`, each member carrying `priority` (`EnumQueuePriority`) and `idempotencyKey` (`string | null`). The union sits in the kit's outbox interface file; a new job adds its member there, the `data` type imported from its feature's payload interface with `import type`.
- The module owning the job builds the effect in a service method `<action>Effect` returning `IOutboxEffect` (`SessionService.purgeLoginsEffect`). No call site writes an effect literal. A service adds the effects its own module's or a lower module's builder returns (`layering.md`, Dependency order).
- `idempotencyKey` is also the BullMQ `jobId`. It is filled from a `<namespace>.idempotencyKey.<name>Pattern` config key only when a duplicate the normal flow produces collapses into one job; any other effect passes `null`, and the row id becomes its key.

## Writing and dispatch

- A transaction whose statements add a row opens through `OutboxService.withTransaction(fn, options?)`. It opens `DatabaseService.withTransaction`, collects every id added on that `tx`, and dispatches them after the commit. Who opens it: `database.md`, Transactions.
- Inside it, `OutboxService.addInTx(tx, effect)` and `addManyInTx(tx, effects)` write the rows and return their ids. An effect whose `idempotencyKey` already has a row inserts nothing and returns that row's id. A service `*InTx` method adds its own rows to the `tx` it joined and returns nothing for them. `addInTx` on a `tx` that `OutboxService.withTransaction` did not open throws.
- A statement whose effect must not be lost shares one transaction with its row, a single statement included. A statement followed by an add outside its transaction is the defect.
- `OutboxService.add(effect)` and `addMany(effects)` insert and dispatch at once, only for an effect with no business write.
- Dispatch never throws and never changes the response. A failed enqueue leaves the row `pending`; a Redis connection error warns once per `redis.warnWindowInMs`, any other error warns once, and nothing goes to Sentry.
- The sweep (`OutboxProcessor`, every `queue.outbox.sweepIntervalInMs` and once at boot) re-dispatches rows `pending` longer than `queue.outbox.pendingAfterInMs`, oldest first, at most `queue.outbox.sweepBatch` a run. A job BullMQ returns for another row's `outboxId` stamps the row `duplicate`.

## Processing

- `QueueProcessorBase.process` loads the row of a job whose data holds an `outboxId` and passes `row.data` to `handle(job, data)`. A job scheduler tick carries no `outboxId`, has no row, and passes `job.data`.
- The base stamps the row `completed` with its attempts on return, and `failed` with the message on the last attempt or an `UnrecoverableError`. A retrying job stays `enqueued`.
