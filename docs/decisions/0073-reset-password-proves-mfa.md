# 0073. A password reset proves any MFA method

- Status: accepted
- Date: 2026-11-15

## Context

A reset link proves only access to the inbox. Without an MFA proof, a stolen inbox takes over an account that has MFA (ASVS 5.0 6.4.3).

## Decision

A forgot-password reset of a user with MFA proves one enrolled method: TOTP, a backup code, or a passkey through a `resetPassword` challenge from `POST /public/user/password/reset/mfa/options`.

## Considered options

- any enrolled method, a passkey included (chosen)
- TOTP or a backup code only: rejected, a passkey-only user would spend a backup code on every reset.
- no MFA on the reset: rejected, the inbox alone would bypass MFA.

## Consequences

- The options route answers the methods before the reset is submitted.
- The reset counts a failed proof on the one budget (0068).
