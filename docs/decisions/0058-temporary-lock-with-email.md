# 0058. A spent attempt budget is a temporary lock with an email

- Status: accepted
- Date: 2026-11-15

## Context

A spent password or two-factor budget deactivated the account and revoked every session and device until an admin reactivated it. Anyone who knows an email could switch an account off with five manual guesses and sign its owner out.

## Decision

The failure that reaches the budget sets `User.passwordLockedUntil` or `TwoFactor.lockedUntil` 15 minutes ahead and sends the owner the mandatory `loginLocked` email. The account keeps its status, sessions, and devices; the lock opens with the clock.

## Considered options

- A timed lock with an email (chosen)
- Deactivating the account: rejected, a stranger switches the account off and signs its owner out.
- A temporary `inactive` status with a delayed reactivation job: rejected, it mixes with an admin's deactivation, needs a job that can fail, and still revokes the owner's sessions.
- A timed lock with no email: rejected, the owner never learns someone is guessing.

## Consequences

- No lockout job; a reactivation, a password write, or an admin two-factor reset clears the matching lock (`auth.md`, Two-factor).
- The near-lockout analytics count a locked account as at the budget.
