# 0043. The outbox is a feature module with its own queue

- Status: accepted
- Date: 2026-11-11

## Context

The outbox holds rows, a repository, and a sweep that runs once a minute across every instance. It sat inside the queue kit, which made the framework layer hold feature state and register a queue.

## Decision

The outbox is the feature module `src/modules/outbox/`, the lowest in the dependency order (0010), so a kernel service may inject `OutboxService`. It registers its own queue in `outbox.module.ts`, and its processor awaits `OutboxProcessSweepUseCase`. Its config is `outbox.*`. The queue kit moves to `src/common/queue/` and registers no queue.

## Considered options

- the lowest feature module with its own queue (chosen)
- the outbox in the queue kit: rejected, the framework layer then holds feature state and registers a queue.
- a `@nestjs/schedule` cron sweep: rejected, it runs on every replica and adds a dependency, where a BullMQ job scheduler runs each tick once.

## Consequences

- `OutboxService.dispatch` resolves each queue through `ModuleRef.get(getQueueToken(name), { strict: false })`, so the outbox imports no other feature module.
- `QueueProcessorBase` knows `OutboxService` through `import type`; each processor forwards it to `super(...)`.
- `.claude/rules/outbox.md`, `queue.md`, and `layering.md` carry it.
