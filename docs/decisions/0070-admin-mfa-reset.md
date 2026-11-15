# 0070. An admin MFA reset forces no enrolment

- Status: accepted
- Date: 2026-11-15

## Context

An admin resets a user's MFA, usually after a lost device. MFA is optional for every user, so forcing enrolment after a reset would make one user's MFA mandatory.

## Decision

An admin MFA reset deletes every factor, clears the backup codes, counter, and lock, revokes every session, and sends the mandatory `resetMfaByAdmin` email. The next login asks no MFA.

## Considered options

- remove every factor, no forced enrolment (chosen)
- `requiredSetup` and enrolment at the next login: rejected, it contradicts optional MFA and needs a setup branch per factor at login.

## Consequences

- No login-time setup route exists.
- The rank gate on admin user writes applies to the reset.
