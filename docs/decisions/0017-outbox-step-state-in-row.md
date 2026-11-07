# 0017. Step state lives in the row

- Status: accepted
- Date: 2026-11-07

## Context

A job records state between attempts: `completedSteps`, `encryptedPendingTokens`, and the resolved recipient. Every attempt and every re-dispatch reads the same state.

## Decision

Step state between attempts is written to `Outbox.data` through `OutboxService.updateData(outboxId, patch)`.

## Considered options

- `OutboxService.updateData` (chosen)
- `job.updateData`: rejected, the row is the one source every attempt and every re-dispatch reads, and the recorded decision is part of the history.

## Consequences

`job.updateData` does not appear in `src/modules/`.
