# 0062. The guard caches the role, not the user

- Status: accepted
- Date: 2026-11-15

## Context

`UserService.validateUserGuard` read the user with its role, policies, and two-factor row from MongoDB on every guarded request, the load the session cache (0026) exists to spare.

## Decision

`RoleCache` holds a role with its policies per role id, leased, 15 minutes, invalidated by `cache.invalidate` inside every role and policy write. The guard reads the user row uncached, then the role through `RoleService.getOne`.

## Considered options

- Cache the role, read the user row (chosen)
- No cache: rejected, three models per request.
- Cache the user too: rejected, every user write (status, role, password, profile, two-factor) would need an invalidation, and a missed one delays a block.

## Consequences

- A status, password, or role-assignment change on a user takes effect on the next request (`cache.md`).
- A policy write is invalidated by its use case through `RoleService.invalidateEffect`, `PolicyService` being a kernel module.
