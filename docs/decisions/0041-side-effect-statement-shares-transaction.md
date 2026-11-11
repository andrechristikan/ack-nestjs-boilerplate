# 0041. A statement with a side effect shares a transaction with its row

- Status: accepted
- Date: 2026-11-11

## Context

A single statement opens no transaction. Some single statements carry an effect that must not be lost: an attempt counter reaching its lockout, a photo replace deleting the old object, a session revoke purging its cache entry.

## Decision

The statement and its outbox row run in one transaction opened through `OutboxService.withTransaction`. `OutboxService.add` is only for an effect with no business write.

## Considered options

- the statement and its row in one transaction (chosen)
- a non-transactional add after the statement: rejected, a crash or a MongoDB failure between the two loses the effect the outbox exists to keep.

## Consequences

- A wrapped statement runs under snapshot isolation and can conflict with a concurrent writer; a guarded transition maps its write conflict to the guard's own exception (0001).
- `.claude/rules/database.md`, Transactions, and `.claude/rules/outbox.md` carry it.
