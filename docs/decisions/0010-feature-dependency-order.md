# 0010. Feature dependency order

- Status: accepted
- Date: 2026-11-07

## Context

A service injects services and utils only of lower modules, so the features need one order. Lower and higher come from each `<Module>Module`'s `imports:`, and lint keeps that graph acyclic. A `@Global()` module is imported by no module file, so it ranks below every module whose services inject it. The module files and those global injections declare the order: notification depends on device, the auth strategy on session, analytic on every feature.

## Decision

The feature order, lowest first, is kernel (country, feature-flag, role, policy, api-key, activity-log, hello, health), device, session, auth, password-history, notification, term-policy, user, workspace, project, analytic.

## Considered options

- kernel, device, session, auth, password-history, notification, term-policy, user, workspace, project, analytic (chosen)
- password-history in the kernel: rejected, its service injects `AuthPasswordUtil`, so it sits above auth.
- `AuthPasswordUtil` in the kit: rejected, it is auth-specific, the kit takes only a module-agnostic concept with three callers or more, and `password-history` above `auth` costs nothing.

## Consequences

- A kernel module injects no other feature's service or util.
- A service injects the services and utils of its own module, of a module its module file imports, and of a lower `@Global()` module, never a higher module's service.
- A use case injects any module's services but stays inside its feature: only `src/router/` imports a use-case module.
- A new edge adds an import to the module file, and the review checks that this list and the module files agree.
