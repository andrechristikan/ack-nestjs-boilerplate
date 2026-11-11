# 0025. Redis and MongoDB are both required

- Status: accepted
- Date: 2026-11-11

## Context

The Redis client queues commands while it reconnects, so an outage makes every route wait behind the throttle guard. Prisma's MongoDB `$connect()` resolves without reaching a server, and a query during an outage waits out the driver's 30-second server-selection timeout, then answers 500.

## Decision

The app does not boot while Redis or MongoDB is down. After boot, a Redis connection error, a command timeout or a direct enqueue's included, answers 503 (`RedisUnavailableException`) fast, and a MongoDB server-selection timeout answers 503 (`DatabaseUnavailableException`) within `database.serverSelectionTimeoutInMs`. Every other Redis error is a miss, logged once per key per window.

## Considered options

- no boot while Redis or MongoDB is down; an outage of either answers 503 fast (chosen)
- fail-open on an outage: rejected, Redis and MongoDB are always on, so an outage of either answers an error, fast.
- Mongo-based rate limiting: rejected, it costs one write per request on every route.
- booting while Redis or MongoDB is down: rejected, the half-booted app answers errors until restarted.
- 500 for an enqueue's connection error or a MongoDB server-selection timeout: rejected, each is an outage the client can retry.
- the driver's default server-selection timeout: rejected, a request waits 30 seconds before it fails.

## Consequences

- `RedisClientFactory.connect` awaits every client at boot; `DatabaseService.onModuleInit` pings MongoDB after `$connect()`.
- `AppGeneralFilter` maps a Redis connection error through `CacheService.isConnectionError` and a MongoDB server-selection timeout through `DatabaseUtil.toException`, an `AppUnknownException` wrap included (`cache.md`, `database.md`).
