# 0030. Health follows Redis

- Status: accepted
- Date: 2026-11-07

## Context

The health indicator probes Redis through `cacheManager.get`, which swallows errors, so it always reports up. A Redis outage leaves the API answering errors while health stays up.

## Decision

`HealthRedisIndicator` runs `PING` through the client and reports down on an error, so Redis down marks health down.

## Considered options

- Redis down marks health down (chosen)
- an informational indicator: rejected, the API is not healthy without its cache.

## Consequences

The API reports unhealthy while Redis is down.
