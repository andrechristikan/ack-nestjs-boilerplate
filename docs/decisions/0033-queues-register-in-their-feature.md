# 0033. Queues register in their feature

- Status: accepted
- Date: 2026-11-08

## Context

This record supersedes 0018, which kept every feature queue in the kit: one `EnumQueue`, `QueueModule.forRoot()` registering each member, and the factories under `src/queues/`. The kit then knew every feature. `@nestjs/bullmq` builds a worker from its queue's options unless the worker options carry a connection.

## Decision

Each feature names its queues in `Enum<Module>Queue` (`<module>.enum.ts`) and registers them in its `<module>.module.ts` with its own factory, which returns job options only. Each queue has one factory (notification has three). `QueueModule.forRoot()` holds one shared BullMQ config with the fast-fail producer connection and no config key, so an enqueue against a down Redis rejects at once instead of hanging the request. `@QueueProcessor()` builds the worker connection from the default exports of `src/configs/redis.config.ts` and `src/configs/app.config.ts`, so a worker waits and resumes by itself after an outage. Health registers its own queue, `EnumHealthQueue.health`, and its indicator checks that queue's client is ready, which means BullMQ is up.

## Considered options

- registration in the owning feature (chosen)
- eight factories in `src/queues/` (0018's shape): rejected, the kit would know every feature.
- a single fast-fail connection for workers too: rejected, workers would error during an outage instead of waiting.
- `process.env` back in the decorator: rejected, the owner removed it.
- one `EnumQueue` or a `<module>.queue.enum.ts` file: rejected, `Enum<Module>Queue` in `<module>.enum.ts` follows the enum rule.
- a kit health check over every queue: rejected, health only needs to know BullMQ runs.

## Consequences

- A new queue adds its enum member, factory, and registration in its own module.
- No feature queue lives in `src/queues/`.
- The outbox resolves a queue by its `Enum<Module>Queue` value through `ModuleRef.get(getQueueToken(name), { strict: false })`, which searches every module, so the kit imports no feature module.
