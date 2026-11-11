# 0042. Outbox key unique per queue and process

- Status: accepted
- Date: 2026-11-11

## Context

A kind that collapses duplicates carries a business `idempotencyKey`, also the BullMQ `jobId`. 0016 relied on a read inside the transaction and an index with no unique constraint, which leaves a raced duplicate row with no database guarantee. The owner wants the key held unique on purpose, for idempotency, accepting 0016's cost: a duplicate-key error aborts the MongoDB transaction it lands in.

## Decision

`Outbox` carries `@@unique([queue, name, idempotencyKey])`. `addInTx` keeps the read by key on `tx`, so the normal path returns the existing row's id; the unique index answers a race. A business key pattern carries the process. Supersedes 0016.

## Considered options

- a compound unique on `(queue, name, idempotencyKey)` plus the read on `tx` (chosen)
- no unique index: rejected, a raced duplicate row has no database guarantee.
- a unique index on the key alone: rejected, the guarantee belongs to one queue and process, and keys of different queues may coincide.

## Consequences

- The loser of a race aborts its whole transaction, business write included.
- `EnumOutboxStatus` has no `duplicate`: `pending`, `enqueued`, `completed`, `failed`.
- `.claude/rules/outbox.md` carries it.
