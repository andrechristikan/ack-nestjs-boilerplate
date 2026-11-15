# 0071. An email code re-authenticates an account with nothing else

- Status: accepted
- Date: 2026-11-15

## Context

A social-only account without two-factor has no password and no code to prove itself with, so its sensitive flows relied on the session alone.

## Decision

Such an account re-authenticates with a one-time code sent to its email. No account with a password or two-factor can request one.

## Considered options

- an email code only for an account with no password and no two-factor (chosen)
- the session alone: rejected, a stolen or unlocked device could change the account.
- the code replacing the password: rejected, the weaker proof would stand in for a stronger one the user holds.

## Consequences

- A wrong code leaves the code valid until it expires; the strict throttle bounds guessing.
