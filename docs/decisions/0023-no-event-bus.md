# 0023. No event bus

- Status: accepted
- Date: 2026-11-07

## Context

Side effects already run on BullMQ. An in-process event bus would be a second route for the same work.

## Decision

BullMQ, fed by the outbox, is the one async mechanism.

## Considered options

- BullMQ through the outbox is the one async mechanism (chosen)
- `@nestjs/event-emitter`: rejected, in-memory events add a second, non-durable mechanism whose `suppressErrors` default swallows listener failures.
- `@nestjs/cqrs`: rejected, it adds the same second, non-durable in-memory mechanism.

## Consequences

No second async mechanism sits beside BullMQ.
