# 0033. Queues register in their feature

- Status: accepted
- Date: 2026-11-11

## Context

This record supersedes 0018, which kept every feature queue in the kit: one `EnumQueue`, `QueueModule.forRoot()` registering each member, and the factories under `src/queues/`. The kit then knew every feature. `@nestjs/bullmq` reads `@Processor` worker options when the class is defined, before DI, and builds each worker on its queue's connection unless those options carry one.

## Decision

Each feature names its queues in `Enum<Module>Queue` (`<module>.enum.ts`) and registers them in its `<module>.module.ts` with its own factory returning job options only. `QueueModule.forRoot()` holds one shared BullMQ config on the fast-fail producer connection, so an enqueue against a down Redis rejects at once. Every worker runs on `RedisQueueWorkerClient`, which the redis kit module provides, through `BullModule.workerClass`, so it waits out an outage. Health registers `EnumHealthQueue.health` and checks that queue's client is ready.

## Considered options

- registration in the owning feature (chosen)
- eight factories in `src/queues/` (0018's shape): rejected, the kit would know every feature.
- a single fast-fail connection for workers too: rejected, workers would error during an outage instead of waiting.
- `process.env` back in the decorator: rejected, the owner removed it.
- a module-level client in the decorator: rejected, it builds a Redis client outside the redis module, which can neither log nor close it.
- the worker `configKey`: rejected, the explorer ignores it for a registered queue.
- writing the internal `bullmq:worker_metadata`: rejected, a private key of `@nestjs/bullmq` an upgrade may change.
- a kit worker registrar through `DiscoveryService`: rejected, it rebuilds the worker creation and shutdown the explorer already owns.
- one `EnumQueue` or a `<module>.queue.enum.ts` file: rejected, `Enum<Module>Queue` in `<module>.enum.ts` follows the enum rule.
- a kit health check over every queue: rejected, health only needs to know BullMQ runs.

## Consequences

- A new queue adds its enum member, factory, and registration in its own module.
- No feature queue lives in `src/queues/`.
- The outbox resolves a queue by its `Enum<Module>Queue` value through `ModuleRef.get(getQueueToken(name), { strict: false })`, which searches every module, so the kit imports no feature module.
