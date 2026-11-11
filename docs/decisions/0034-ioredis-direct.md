# 0034. ioredis direct, no Keyv

- Status: accepted
- Date: 2026-11-11

## Context

This record supersedes 0029. The cache ran on Keyv with `@keyv/redis` and `@redis/client` while BullMQ ran on ioredis: two client libraries, two error vocabularies, Keyv's value envelope, store-client casts, and an `overrides:` pin held them together.

## Decision

Every Redis connection is an ioredis client `RedisModule.forRoot()` creates. `CacheService.readThrough`, `invalidate`, and `isConnectionError` talk to the cache client directly: plain JSON values with `PX`, every key prefixed `Cache:` by the client.

## Considered options

- ioredis direct for the cache and BullMQ (chosen)
- Keyv over `@keyv/redis` (0029's shape): rejected, a second client library beside BullMQ's ioredis, with its own errors, a value envelope, and an `overrides:` pin.
- `cache-manager`: rejected, its `get` swallows every store error and returns `undefined`, so a read-through built on it never sees a connection error.

## Consequences

- One connection-error classifier, `CacheService.isConnectionError`, covers ioredis messages, error names, and socket codes.
- Every cache class is a thin typed wrapper over `readThrough` and `invalidate`, with no try/catch of its own, and passes unprefixed keys (`cache.md`).
