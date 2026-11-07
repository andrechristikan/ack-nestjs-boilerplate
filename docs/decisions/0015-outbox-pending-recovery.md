# 0015. Pending rows recovered by boot drain and a one-minute sweep

- Status: accepted
- Date: 2026-11-07

## Context

A failed `add` after commit leaves the outbox row `pending`. Something dispatches such rows again, and every extra Redis call has a cost.

## Decision

`OutboxProcessor` runs every `queue.outbox.sweepIntervalInMs` (60000) over rows `pending` longer than `queue.outbox.pendingAfterInMs` (30000), bounded by `queue.outbox.sweepBatch` (100). The same sweep runs once at boot.

## Considered options

- the sweep re-dispatches rows `pending` after 30 seconds (chosen)
- boot drain alone: rejected, a row whose `add` failed would stay `pending` until the next restart.
- retry on the next request: rejected, recovery latency would depend on traffic and every request would pay an extra query, while one scheduled job a minute is cheaper and predictable.

## Consequences

- The sweep costs one job a minute, a handful of Redis commands, and one indexed Mongo query.
- A duplicate dispatch is harmless, because BullMQ ignores an `add` whose `jobId` exists.
