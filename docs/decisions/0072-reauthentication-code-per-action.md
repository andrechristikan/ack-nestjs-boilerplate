# 0072. The re-authentication code is bound to one action

- Status: accepted
- Date: 2026-11-15

## Context

A code works once and its resend waits 2 minutes, so a user running two sensitive actions in a row waited for the second code.

## Decision

The send request names an `EnumUserReauthenticationAction`; the code verifies only for that action, and the resend window counts the latest code per user and action, used or not.

## Considered options

- a code and a window per action (chosen)
- one code and one window for every action: rejected, a two-step flow waits, and a code for one action could serve another.
- a time-boxed re-authenticated session: rejected, it adds session state and drops the one-use code.

## Consequences

- `Verification.action` holds the action on a `reauthentication` row.
