# 0016. Dedupe by `jobId` and `idempotencyKey`

- Status: accepted
- Date: 2026-11-07

## Context

Some kinds collapse duplicates, such as a once-per-user welcome. BullMQ ignores an `add` whose `jobId` exists, and a business key can carry the dedupe where a kind needs one.

## Decision

The BullMQ `jobId` is the row's `idempotencyKey`, the business key where the kind has one and otherwise the row id. `addInTx` with a business key reads `Outbox` by that key inside `tx` and inserts nothing when a row exists.

## Considered options

- `jobId = idempotencyKey` and a read inside the transaction before the insert (chosen)
- a unique index on the key: rejected, a duplicate-key error inside a MongoDB transaction aborts the whole transaction, the business write included.

## Consequences

- `idempotencyKey` is required and indexed, not unique.
- A row whose job already exists is stamped `duplicate`.
- A kind that may repeat for one subject keeps the row id as its key.
