# 0028. Two-factor challenge is a row

- Status: accepted
- Date: 2026-11-07

## Context

The two-factor login challenge lives only in Redis. A Redis read error is swallowed into `AuthTwoFactorChallengeInvalidException`, which is the wrong answer.

## Decision

The two-factor login challenge is a `TwoFactorChallenge` row, a `TwoFactor` satellite in the user module. The login transaction creates it, and a guarded `updateMany` inside the verify transaction claims it.

## Considered options

- `TwoFactorChallenge` claimed inside the verify transaction (chosen)
- the challenge as Redis state (`GETDEL`): rejected, a Redis read error turns into `AuthTwoFactorChallengeInvalidException`, the wrong answer.

## Consequences

- The challenge token is stored as its SHA-256 `tokenHash`.
- The push token rides in the row encrypted.
- Rows are kept, like `ForgotPassword`.
