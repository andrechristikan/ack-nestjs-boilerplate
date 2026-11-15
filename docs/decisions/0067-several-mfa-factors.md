# 0067. Several MFA factors, one picked at login

- Status: accepted
- Date: 2026-11-15

## Context

With TOTP and passkeys, a user may hold more than one factor. The login must decide which one proves the second step.

## Decision

A user enrols any number of factors within their limits, and the login answers the enrolled methods; the user proves any one of them, or a backup code.

## Considered options

- several factors, one picked at login (chosen)
- exactly one active factor: rejected, losing that one device leaves only backup codes.

## Consequences

- The login answer carries `methods` and, with a passkey, the WebAuthn options.
- TOTP is one per user, passkeys up to `mfa.passkey.maxPerUser`.
