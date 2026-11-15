# 0064. Feature dependency order with MFA

- Status: accepted
- Date: 2026-11-15

## Context

Multi-factor authentication spans TOTP, passkeys, backup codes, a challenge row, and a shared attempt budget. Split between `user` and `auth`, no module owned it, and the login flows in `user` need it below them.

## Decision

The feature order, lowest first, is kernel (country, feature-flag, role, policy, api-key, activity-log, hello, health), device, session, auth, password-history, notification, mfa, term-policy, user, workspace, project, analytic. `MfaModule` imports `NotificationModule`; `UserModule` imports `MfaModule`. Supersedes 0055.

## Considered options

- `mfa` between `notification` and `term-policy` (chosen)
- two-factor kept in `user` and `auth`: rejected, no single module owns the factors, the counter, and the challenge, and `auth` would need user rows.
- `mfa` above `user`: rejected, the login, re-authentication, and reset flows in `user` call MFA, which would reverse the edge.
- password-history in the kernel: rejected, its service injects `AuthPasswordUtil`, so it sits above auth.
- `AuthPasswordUtil` in the kit: rejected, it is auth-specific, and the kit takes only a module-agnostic concept with three callers or more.

## Consequences

- An `mfa` service injects no `user` service; a use case passes the user values it needs (email, username).
- `layering.md`, Dependency order, carries the list.
