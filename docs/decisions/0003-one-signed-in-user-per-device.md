# 0003. One signed-in user per device

- Status: accepted
- Date: 2026-11-07

## Context

A `Device` row, keyed by its immutable fingerprint, can carry `DeviceOwnership` rows of several users. When a second user logs in on a device where another user is signed in, the earlier session stays alive unless the server ends it.

## Decision

A device holds one signed-in user, and a login revokes, inside its transaction, every live session of every other user whose `DeviceOwnership` points at the same `Device`. The server enforces it, not a client contract.

## Considered options

- a login signs out every other user on the device (chosen)
- several accounts signed in on one device: rejected, a crashed or careless client would keep the earlier user's refresh token valid on a device another user now holds.

## Consequences

- The other users' `DeviceOwnership` rows stay unrevoked, so the device stays in their list with no live session.
- Each affected user gets one activity row.
- No notification goes to an affected user.
- `.claude/rules/auth.md`, Session invalidation, carries the rule.
