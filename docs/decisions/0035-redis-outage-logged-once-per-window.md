# 0035. A Redis outage is logged once per window

- Status: accepted
- Date: 2026-11-08

## Context

During a Redis outage every request touching Redis answers 503 `RedisUnavailableException`. A 5xx is logged and reported to Sentry, so one outage would write one error log and one Sentry event per request.

## Decision

`AppGeneralFilter` answers 503 for every `RedisUnavailableException` and writes its error log and Sentry report at most once per `redis.warnWindowInMs`, through `CacheService.isFirstInWindow`.

## Considered options

- one log and report per window (chosen)
- one log and report per request: rejected, an outage floods the logs and spends the Sentry quota.
- a per-request log with no Sentry report: rejected, the logs still flood and Sentry never sees the outage.

## Consequences

- The response stays 503 on every request; only the log and the report are windowed.
- `cache.md` and `exceptions.md` carry the window.
