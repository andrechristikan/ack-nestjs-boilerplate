# 0038. A cache delete fails a request only on a connection error

- Status: accepted
- Date: 2026-11-08

## Context

An API-key or feature-flag write deletes its cache entry after the transaction commits. Until phase 3D moves that delete into the `cache.invalidate` job (record 0022), a failed delete runs inside the request whose write already committed.

## Decision

`delete<Subject>` runs through `CacheService.invalidate`: a connection error answers 503, and any other error is a `warn` while the committed write answers success.

## Considered options

- a delete fails the request only on a connection error (chosen)
- every delete error answers 5xx after the commit: rejected, a request whose write committed answers failure for a cache miss that heals by TTL.

## Consequences

- A stale entry after a non-connection delete error lives until its TTL.
- Phase 3D replaces the delete with the `cache.invalidate` job (record 0022).
