# 0025. Redis and MongoDB are both required

- Status: accepted
- Date: 2026-11-11

## Context

The Redis client queues commands while it reconnects and has no command timeout. A Redis outage after connect makes every route wait behind the throttle guard. A Redis down at boot left a half-booted app answering 503, and a direct enqueue failing on a connection error answered 500.

## Decision

The app does not boot while Redis is down. After boot, a Redis connection error, a command timeout or a direct enqueue's included, answers 503 (`RedisUnavailableException`) fast. Every other Redis error is a miss, logged once per key per window.

## Considered options

- no boot while Redis is down; a connection error, a command timeout or a direct enqueue's included, answers 503 fast (chosen)
- fail-open on an outage: rejected, Redis and MongoDB are always on, so an outage of either answers an error, fast.
- Mongo-based rate limiting: rejected, it costs one write per request on every route.
- booting while Redis is down: rejected, the half-booted app answers 503 until restarted.
- 500 for an enqueue's connection error: rejected, it is an outage the client can retry.

## Consequences

The throttle answers 503 on a Redis connection error. `RedisClientFactory.connect` awaits every client at boot; `AppGeneralFilter` maps a connection error through `CacheService.isConnectionError`, an enqueue wrapped in `AppUnknownException` included.
