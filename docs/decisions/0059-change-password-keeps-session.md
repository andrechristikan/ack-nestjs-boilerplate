# 0059. Change-password keeps the current session

- Status: accepted
- Date: 2026-11-15

## Context

Change-password revoked every session of the user, the one making the change included, so a successful change signed the user out at once.

## Decision

Change-password revokes every other live session of the user and keeps the session that made the change (`SessionService.revokeActiveByUserExceptInTx`). A forgot-password reset still revokes every session.

## Considered options

- Revoke every other session (chosen)
- Revoke every session: rejected, the user who just proved the password is signed out.
- Revoke every session and issue new tokens: rejected, the route's response changes for no gain over keeping the session.

## Consequences

- An attacker holding the old password loses every session; the owner stays signed in (`auth.md`, Session invalidation).
