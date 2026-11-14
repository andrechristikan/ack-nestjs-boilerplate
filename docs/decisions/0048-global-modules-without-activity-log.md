# 0048. `@Global()` for guard-injected modules, activity log not global

- Status: accepted
- Date: 2026-11-12

## Context

0044 kept `ActivityLogModule` global only while `ActivityLogInterceptor` injected it. Activity entries are now outbox rows added through `ActivityLogService.recordEffect` in the write's transaction, so the interceptor and the CLS stage are gone and no guard, strategy, interceptor, or decorator injects the module.

## Decision

`@Global()` stays on the seven guard-injected modules (`ApiKeyModule`, `AuthModule`, `FeatureFlagModule`, `PolicyModule`, `RoleModule`, `SessionModule`, `TermPolicyModule`). `ActivityLogModule` is imported by each module whose services or use cases inject `ActivityLogService`. Supersedes 0044.

## Considered options

- seven guard-injected modules (chosen)
- `ActivityLogModule` kept global: rejected, no guard, strategy, interceptor, or decorator injects it any more.
- notification global: rejected, no guard injects it, and its importers name `NotificationModule` explicitly.
- everything global: rejected, the NestJS modules guide calls it not a recommended design practice.

## Consequences

- A module recording activity imports `ActivityLogModule` in its module file.
- `.claude/rules/layering.md`, `@Global()`, carries the list.
- Outbox clause removed by 0053: `OutboxModule` is a kit global (0054).
