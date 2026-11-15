# 0060. A session revoke clears its cache keys through the purge row

- Status: accepted
- Date: 2026-11-15

## Context

With the session row deciding (0026), a revoke still has to remove the cached login entries. Each revoke already adds one `purgeLogins` outbox row that clears the device push tokens.

## Decision

The one `purgeLogins` row per revoke also invalidates the revoked sessions' login keys, through `SessionService.deleteLogins` and `CacheService.invalidate`.

## Considered options

- The one `purgeLogins` row clears the keys (chosen)
- A `cache.invalidate` row beside a purge row that clears tokens only: rejected, two rows per revoke and a reshaped payload for the same work.

## Consequences

- `SessionService.deleteLogins` is one of the two feature callers of `CacheService.invalidate` (`eslint.md`, Move to ESLint).
