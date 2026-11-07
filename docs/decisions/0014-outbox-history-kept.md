# 0014. Outbox history is kept

- Status: accepted
- Date: 2026-11-07

## Context

BullMQ keeps completed jobs 7 days and failed jobs 14 days. The database shows every side effect ever fired.

## Decision

Outbox rows stay after their job completes.

## Considered options

- rows stay after completion (chosen)
- a cleanup job: rejected, a completed job already leaves BullMQ on its own, and the database keeps every side effect's history.
- a retention period: rejected, the history of every side effect stays in the database.

## Consequences

A retention sweep is a separate decision, taken if storage calls for it.
