# 0027. One transaction per flow, cross-module allowed

- Status: accepted
- Date: 2026-11-07

## Context

Mongo writes join one transaction, and Redis writes cannot. A compensating write after commit exists only because the session was written to Redis after the commit.

## Decision

A write flow is one Mongo transaction, crossing modules when the flow spans them, opened by the use case or the highest participating service.

## Considered options

- the use case or the highest service opens one transaction (chosen)
- two transactions where one suffices: rejected, a flow is one transaction, so a failure leaves no committed half.
- a compensating write after commit: rejected, it exists only because Redis was written after commit, and Redis is not the authority.

## Consequences

`loginVerifyTwoFactor`, `rotateSession`, and `loginWithSocial` each run in one transaction.
