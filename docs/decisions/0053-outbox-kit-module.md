# 0053. The outbox is a kit module beside the queue kit

- Status: accepted
- Date: 2026-11-14

## Context

`QueueProcessorBase` loads, completes, and fails an outbox row for every job, and `CacheService.invalidateEffect` returns an `IOutboxEffect`, so the kit imported the outbox feature above it, held open by an exception in 0052. The outbox carries any queue's payload and knows no domain: its row is infrastructure state.

## Decision

The outbox is the kit module `src/common/outbox/`, separate from `src/common/queue/`. `OutboxModule` registers its own queue, `OutboxRepository` is the kit's one repository, and `OutboxProcessor` awaits `OutboxService.sweep()`. Supersedes 0043.

## Considered options

- a kit module beside the queue kit (chosen)
- the outbox in `src/modules/`: rejected, the kit then imports a feature above it.
- a kit port the feature `OutboxService` implements: rejected, an abstraction for one implementor.
- the outbox merged into the queue kit: rejected, the queue kit then holds rows and registers a queue.
- a kit use-case layer for the sweep: rejected, the kit has no use cases; `CacheProcessor` already calls `CacheService` directly.

## Consequences

- `OutboxProcessSweepUseCase` and `OutboxUseCaseModule` are deleted.
- The kit holds the base `IOutboxEffect`; each owner declares its `I<Module><Action>Effect` member, so the kit imports no feature type (0052).
- The outbox leaves the feature dependency order (0055); the 0052 outbox exception and the processor lint allowance end.
- `.claude/rules/outbox.md`, `layering.md`, and `eslint.md` carry it.
