# 0013. Thick outbox, BullMQ as the worker

- Status: accepted
- Date: 2026-11-07

## Context

Every side effect of a request already runs as a BullMQ job, enqueued after the commit with the offline queue disabled. Each side effect needs a durable source and a history in the database.

## Decision

Every side effect is an `Outbox` row written inside the business transaction, with its status and history. After commit the caller dispatches it, and the BullMQ job carries `{ outboxId }` only.

## Considered options

- an `Outbox` row in the transaction, the job carries `{ outboxId }`, dispatch after commit (chosen)
- no outbox (post-commit enqueue): rejected, a crash or a Redis outage between commit and enqueue loses the side effect, and nothing re-sends it.
- a thin outbox deleting rows after enqueue: rejected, every side effect keeps its history in the database.
- the payload copied into the job: rejected, BullMQ is the worker and the database holds the data.

## Consequences

- No side effect is enqueued inside the transaction.
- A side-effect failure never changes the response.
- A row whose dispatch fails stays `pending` until the sweep in 0015 dispatches it again.
