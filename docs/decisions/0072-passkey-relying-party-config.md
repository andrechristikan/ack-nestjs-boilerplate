# 0072. The passkey relying party is required config

- Status: accepted
- Date: 2026-11-15

## Context

WebAuthn binds a passkey to a relying-party id and a set of origins, both the deployer's own domain values. They are neither generated nor fetched.

## Decision

`MFA_PASSKEY_RP_ID` and `MFA_PASSKEY_ORIGINS` are required environment keys; the relying-party name is `APP_NAME`.

## Considered options

- required environment keys (chosen)
- an optional integration: rejected, a deployment could run with passkeys silently off.
- deriving it from `HOME_URL` and `CORS_ALLOWED_ORIGIN`: rejected, an Android app origin is no CORS origin, and the id could not name a parent domain.

## Consequences

- `.env.example` carries the local values.
- `mfa.passkey` in `mfa.config.ts` reads them.
