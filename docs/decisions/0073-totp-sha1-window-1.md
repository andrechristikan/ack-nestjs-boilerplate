# 0073. TOTP stays on SHA-1 with window 1

- Status: accepted
- Date: 2026-11-15

## Context

ASVS lists HMAC-SHA-1 as legacy, and a window of one step tolerates network delay. Several authenticator apps ignore the algorithm parameter.

## Decision

TOTP keeps HMAC-SHA-1, a 30-second step, and `window` 1; `lastUsedStep` refuses a replayed step.

## Considered options

- SHA-1 with `window` 1 (chosen)
- SHA-256: rejected, Google Authenticator on Android and Microsoft Authenticator compute SHA-1 regardless, so setup fails silently.
- `window` 0: rejected, a code typed at the end of its step fails on network delay, against RFC 6238's guidance.

## Consequences

- `auth.twoFactor.algorithm` and `window` keep their values.
