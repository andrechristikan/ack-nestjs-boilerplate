# 0069. Sessions end after 7 days idle

- Status: accepted
- Date: 2026-11-15

## Context

A session lived until its 30-day absolute expiry however long it sat unused. ASVS 7.3.1 requires an inactivity timeout.

## Decision

`Session.lastActiveAt`, stamped at create and on every refresh, ends a session idle longer than `session.idleTimeoutInMs` (7 days); the absolute lifetime stays.

## Considered options

- an inactivity timeout on `Session.lastActiveAt` (chosen)
- the absolute lifetime alone: rejected, a forgotten device stays signed in for a month.

## Consequences

- Every live-session read and the rotation carry the bound; the refresh's reuse revoke carries it too, so an idle refresh revokes nothing (`auth.md`).
