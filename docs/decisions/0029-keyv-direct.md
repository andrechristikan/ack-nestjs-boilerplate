# 0029. Keyv direct, no cache-manager

- Status: accepted
- Date: 2026-11-07

## Context

Every cache class needs one read-through implementation that tells a connection error from any other error. Today the read goes through `cache-manager`, whose `get` swallows every store error, so the error class is lost.

## Decision

`CacheService.readThrough`, `invalidate`, and `isConnectionError` talk to the Keyv client directly.

## Considered options

- `CacheService.readThrough` over the Keyv client (chosen)
- `cache-manager`: rejected, its `get` swallows every store error and returns `undefined`, so a read-through built on it never sees a connection error.

## Consequences

Every cache class is a thin typed wrapper over `readThrough` and `invalidate`, with no try/catch of its own.
