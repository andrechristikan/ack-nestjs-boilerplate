# 0047. The sweep reconciles a stale enqueued row with its job

- Status: accepted
- Date: 2026-11-12

## Context

A row stays `enqueued` when the processor's final stamp fails (MongoDB lost for a moment at the job's end). The sweep read only `pending` rows, so such a row never showed how its job ended (0014). Re-dispatching it blindly hits BullMQ's `jobId` dedupe while the job is retained and reruns it once retention drops the job.

## Decision

The sweep also reads rows `enqueued` longer than `outbox.enqueuedAfterInMs` and reads each one's job by `idempotencyKey`. A `completed` or `failed` job stamps the row the same way, the failure with the job's `failedReason`; a missing job re-dispatches the row; any other state leaves it.

## Considered options

- reconcile with the job's state (chosen)
- re-dispatch and shift `enqueuedAt`: rejected, a job that failed on every attempt runs again once BullMQ's retention drops it.
- leave the row: rejected, the row's outcome is lost from the history.

## Consequences

- `OutboxService` calls `getJob`, the one reader of a job's state (`.claude/rules/queue.md`).
- `.claude/rules/outbox.md` carries it.
