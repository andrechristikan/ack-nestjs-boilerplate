# 0068. One attempt budget across MFA methods

- Status: accepted
- Date: 2026-11-15

## Context

Failed MFA proofs are counted and lock MFA at a budget (0057, 0058). With several methods, the budget could be one or one per method.

## Decision

One counter and one lock on the user's `Mfa` row count every failed TOTP code, backup code, and passkey assertion. Only `MfaService` counts.

## Considered options

- one budget across every method (chosen)
- a budget per method: rejected, switching method would multiply the attempts an attacker gets.

## Consequences

- `MfaTotpService` and `MfaPasskeyService` check without counting.
- An unknown credential at a passkey login counts nothing: it has no user.
