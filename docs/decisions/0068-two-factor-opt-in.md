# 0068. Two-factor stays opt-in

- Status: accepted
- Date: 2026-11-15

## Context

ASVS 6.3.3 requires multi-factor authentication unless a documented rationale and mitigating controls relax it. The product leaves the choice to each user.

## Decision

Two-factor stays optional per user, a recorded departure from 6.3.3.

## Considered options

- opt-in two-factor (chosen)
- mandatory two-factor: rejected, a product decision: the boilerplate leaves enforcement to the product built on it.

## Consequences

- The mitigations are the argon2id passwords, the denylist, the attempt locks, and re-authentication on every sensitive flow.
