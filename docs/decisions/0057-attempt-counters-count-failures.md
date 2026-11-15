# 0057. Attempt counters count failures only

- Status: accepted
- Date: 2026-11-15

## Context

The password and two-factor checks counted every attempt before the credential was checked, then reset the counter with a write outside the flow's transaction. Folding that reset into the transaction would let a business failure after a correct password raise the counter toward a lockout.

## Decision

A wrong password or code counts one failure in its own transaction and throws; a correct one resets the counter inside the flow's one transaction. A correct credential never raises the counter.

## Considered options

- Count failures only, reset inside the flow's transaction (chosen)
- Count first, reset folded into the flow's transaction: rejected, a correct password followed by a failing business step raises the counter and can reach a lockout.
- Count first, reset as a write outside the flow's transaction: rejected, a second write per flow breaks 0027.

## Consequences

- The flow asserts no lock, checks the credential without writing, and counts on a mismatch (`auth.md`, Two-factor).
- Concurrent wrong guesses may pass the budget by a few; the throttle stays.
