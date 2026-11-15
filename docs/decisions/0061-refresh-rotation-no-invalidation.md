# 0061. A refresh rotation adds no cache invalidation

- Status: accepted
- Date: 2026-11-15

## Context

After a refresh the cached login entry holds the old `jtiDigest`. 0026 already reloads the row on a hit whose digest differs from the token's.

## Decision

The rotation transaction writes no cache and adds no invalidation row. The new access token's first request finds the differing digest, invalidates the key, and reloads the row; the old access token then fails against the new digest.

## Considered options

- No invalidation on rotation (chosen)
- A `cache.invalidate` row per refresh: rejected, one more row and job per refresh for what the mismatch reload already does.

## Consequences

- The old access token keeps working until the new one is first used or the entry expires (`session.loginCacheTtlInMs`).
