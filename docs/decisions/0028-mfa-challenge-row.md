# 0028. MFA challenge is a row

- Status: accepted
- Date: 2026-11-07

## Context

An MFA challenge held only in Redis turns a Redis read error into an invalid-challenge answer, which is the wrong answer.

## Decision

Every MFA challenge is an `MfaChallenge` row in the `mfa` module, one purpose per row (`login`, `passwordless`, `registration`, `reauthentication`, `resetPassword`). The flow that issues it creates it in its transaction, and a guarded `updateMany` inside the transaction of the flow it proves claims it.

## Considered options

- `MfaChallenge` claimed inside the transaction of the flow it proves (chosen)
- the challenge as Redis state (`GETDEL`): rejected, a Redis read error turns into `MfaChallengeInvalidException`, the wrong answer.

## Consequences

- The challenge token is stored as its SHA-256 `tokenHash`.
- The push token rides in the row encrypted.
- Rows are kept, like `ForgotPassword`.
