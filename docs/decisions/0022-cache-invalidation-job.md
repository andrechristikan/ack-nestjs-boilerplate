# 0022. Cache invalidation is a job

- Status: accepted
- Date: 2026-11-07

## Context

API-key and feature-flag caches are deleted after the write commits. When that delete fails, a request whose write already committed answers 5xx.

## Decision

`ApiKeyService` and `FeatureFlagService` write a `cache.invalidate { keys }` effect inside the write transaction. One kit queue, `EnumQueue.cache`, with `CacheProcessor` in `src/common/cache/`, deletes the keys.

## Considered options

- API-key and feature-flag invalidation through `cache.invalidate` (chosen)
- a fatal synchronous delete: rejected, a failed delete after commit fails a request whose write already committed.

## Consequences

- A revoked key or a flipped flag stays live until the job runs, seconds.
- No per-module queue is added.
