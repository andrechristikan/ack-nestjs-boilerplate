# 0018. Every queue registers in `QueueModule.forRoot()`

- Status: superseded by 0033
- Date: 2026-11-07

## Context

`OutboxService` and the queue health indicator hold every `Queue`. Each feature module registers its own queues and factories.

## Decision

Every `EnumQueue` member registers once in `QueueModule.forRoot()` with its factory, and `QueueModule` exports `BullModule`.

## Considered options

- the kit holds every `Queue` (chosen)
- per-feature registration: rejected, `OutboxService` and the queue health indicator need every `Queue`, and registering them in the kit keeps the kit free of feature imports.

## Consequences

- A feature queue class keeps `@InjectQueue` for its job schedulers only.
- Queue factories live under `src/queues/factories/`.
