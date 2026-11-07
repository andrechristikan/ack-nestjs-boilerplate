# 0019. Notify by reference

- Status: accepted
- Date: 2026-11-07

## Context

Notification producers read the recipient across the transaction, copy recipient helpers, and branch on `if (recipient)` at about 20 sites. Most of that code is copied machinery.

## Decision

The notification processor resolves the recipient on the first attempt and records it in `Outbox.data`. A `snapshot` field exists only on kinds whose write destroys the source.

## Considered options

- the processor resolves the recipient on the first attempt and records it (chosen)
- a producer snapshot for every kind: rejected, the user, settings, address, and live-session tokens still exist after commit, so a producer-side read only copies machinery into every service.

## Consequences

- The payload shows which kinds decided at the producer.
- The resolve step lives in the notification use case, never in a notification service.
