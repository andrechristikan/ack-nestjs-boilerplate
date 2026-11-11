# 0037. `CacheService.readThrough` is the one cache loader

- Status: accepted
- Date: 2026-11-08

## Context

`code-style.md` forbids a helper taking a function to wrap its execution, `DatabaseService.withTransaction` excepted. A cache-aside read is get, lease, load, set, and it repeats at about 55 call sites.

## Decision

`CacheService.readThrough` is the second loader-taking exception beside `DatabaseService.withTransaction`. A cache class holds key builders and TTLs, and its schema is a `<Subject>CacheSchema` constant in `<module>.constant.ts`.

## Considered options

- `CacheService.readThrough` the one loader-taking cache method (chosen)
- cache-class read methods taking the loader too: rejected, it widens the exception to every cache class.
- no callback at all: rejected, get, lease, load, and set are copied at about 55 call sites.

## Consequences

- A read-through cache class holds no read method, no loader, and no try/catch; the service calls `readThrough` (`cache.md`, Class shape).
