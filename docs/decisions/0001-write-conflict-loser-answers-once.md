# 0001. Write conflict loser answers once

- Status: accepted
- Date: 2026-11-07

## Context

A guarded state transition inside a multi-statement transaction can lose a write conflict. A conflict on a flow such as logout is rare, and the client can send the request again.

## Decision

A transaction that loses a write conflict does not run again, in any flow. Whoever opened a multi-statement transaction holding a guarded transition maps the conflict to the guard's own exception, so the loser answers the guard's 4xx once, never 409.

## Considered options

- the loser gets the guard's exception once (chosen)
- a transaction retry in any flow (logout included): rejected, a write conflict is rare and the client can send the request again, so one attempt is enough.

## Consequences

- No retry and no one-off exception to the rule is proposed as a fix.
- Term-policy publish answers 400 `statusInvalid` to the loser.
- `.claude/rules/database.md`, Transactions, carries the rule.
