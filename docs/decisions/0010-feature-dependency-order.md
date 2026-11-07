# 0010. Feature dependency order

- Status: accepted
- Date: 2026-11-07

## Context

A service injects services only of lower-ranked modules, so the features need one declared order. The order derives from the edges the code has: notification depends on device, the auth strategy on session, and analytic on every feature.

## Decision

The feature order, lowest first, is kernel (country, feature-flag, role, policy, api-key, activity-log, hello, health), device, session, auth, password-history, notification, term-policy, user, workspace, project, analytic.

## Considered options

- kernel, device, session, auth, password-history, notification, term-policy, user, workspace, project, analytic (chosen)
- password-history in the kernel: rejected, its service injects `AuthPasswordUtil`, so it sits above auth.
- `AuthPasswordUtil` in the kit: rejected, it is auth-specific, the kit takes only a module-agnostic concept with three callers or more, and moving `password-history` one rank up costs nothing.

## Consequences

- A kernel module injects no other feature's service.
- A service injects services only of strictly lower modules.
- Use cases, controllers, and processors sit above the list and inject any service.
