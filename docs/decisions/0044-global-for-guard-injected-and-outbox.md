# 0044. `@Global()` for guard-injected modules and the outbox

- Status: accepted
- Date: 2026-11-11

## Context

0011 kept `@Global()` on the eight modules a guard, strategy, interceptor, or decorator injects. Every processor forwards `OutboxService` to `QueueProcessorBase`, and every module whose services write an effect injects it.

## Decision

`@Global()` stays on the eight guard-injected modules and adds `OutboxModule`: nine modules. Notification and every use-case module are not global. Supersedes 0011.

## Considered options

- the eight guard-injected modules plus `OutboxModule` (chosen)
- importing `OutboxModule` in every module that needs it: rejected, the processor router and every module writing an effect would carry the same import.
- notification global: rejected, no guard injects it, and its importers name `NotificationModule` explicitly.
- everything global: rejected, the NestJS modules guide calls it not a recommended design practice.

## Consequences

- `activity-log` keeps `@Global()` only while its interceptor injects it.
- `.claude/rules/layering.md`, `@Global()`, carries the list.
