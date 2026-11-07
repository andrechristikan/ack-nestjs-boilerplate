# 0024. MongoDB is the only authority; Redis is a cache

- Status: accepted
- Date: 2026-11-07

## Context

Every write flow touches two stores. Mongo writes join one transaction and Redis writes cannot. An error that is not an outage, such as a key failing validation or a code error, does not fail a request the database could answer.

## Decision

MongoDB is the only source of truth. Every read falls back to the row on a miss or a non-connection error, and every write is a Mongo transaction that invalidates the cache after commit.

## Considered options

- a miss or a non-connection error reads the row, writes are Mongo transactions invalidating after commit (chosen)
- Redis as the session authority: rejected, a Redis error after a login or refresh commit revokes the committed session or signs the user out.
- write-through as the consistency mechanism: rejected, a failed write-through leaves old data, while a failed delete leaves it only until the TTL.

## Consequences

Redis holds caches and rate-limit counters, nothing else.
