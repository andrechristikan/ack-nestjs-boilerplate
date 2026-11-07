# 0025. Redis and MongoDB are both required

- Status: accepted
- Date: 2026-11-07

## Context

The Redis client queues commands while it reconnects and has no command timeout. A Redis outage after connect makes every route wait behind the throttle guard.

## Decision

A Redis connection error, a command timeout included, throws `RedisUnavailableException` and answers 503 fast. Every other Redis error is a miss, logged once per key per window.

## Considered options

- a connection error, a command timeout included, answers 503 fast (chosen)
- fail-open on an outage: rejected, Redis and MongoDB are always on, so an outage of either answers an error, fast.
- Mongo-based rate limiting: rejected, it costs one write per request on every route.

## Consequences

The throttle answers 503 on a Redis connection error.
