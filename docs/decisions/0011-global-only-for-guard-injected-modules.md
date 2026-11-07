# 0011. `@Global()` only for guard-injected modules

- Status: accepted
- Date: 2026-11-07

## Context

Nine feature modules carry `@Global()`. The NestJS modules guide calls making everything global not a recommended design practice. No guard injects the notification module.

## Decision

`@Global()` stays on the eight modules a guard, strategy, interceptor, or decorator injects: `auth`, `api-key`, `role`, `policy`, `feature-flag`, `term-policy`, `session`, `activity-log`. Notification and every use-case module are not global.

## Considered options

- eight modules global, notification not (chosen)
- notification global: rejected, no guard injects it, and its importers name `NotificationModule` explicitly.
- everything global: rejected, the NestJS modules guide calls it not a recommended design practice.

## Consequences

`activity-log` keeps `@Global()` only while its interceptor injects it.
