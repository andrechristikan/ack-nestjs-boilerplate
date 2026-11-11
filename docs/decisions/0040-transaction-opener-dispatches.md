# 0040. The transaction opener dispatches

- Status: accepted
- Date: 2026-11-11

## Context

An outbox row added inside a transaction is dispatched after the commit (0013). A row is often added deep in a lower service's `*InTx` method (a session revoke adds its own purge row), so whoever dispatches has to learn ids it did not add itself.

## Decision

The opener of a transaction that adds a row opens it through `OutboxService.withTransaction`, which collects every id added on that `tx` and dispatches them after the commit. An `*InTx` method returns nothing for the rows it adds.

## Considered options

- `OutboxService.withTransaction` collects the ids and dispatches after the commit (chosen)
- only the use case dispatches, the ids returned through every layer: rejected, every `*InTx` signature and callback carries outbox ids, and a dropped return leaves the row to the sweep.
- the opener keeps its `tx` and asks `OutboxService` to dispatch for it after the commit: rejected, every opener holds `tx` outside its callback, and a forgotten call fails silently.

## Consequences

- A transaction whose statements add a row opens through `OutboxService.withTransaction`; one that adds none keeps `DatabaseService.withTransaction`.
- `addInTx` on a `tx` that `OutboxService.withTransaction` did not open throws.
- `.claude/rules/outbox.md` carries it.
