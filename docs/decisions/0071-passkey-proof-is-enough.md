# 0071. A passkey proof is a whole proof

- Status: accepted
- Date: 2026-11-15

## Context

A passkey with user verification already proves possession of a device and a biometric or PIN. The flows asking for a second factor had to decide whether a passkey needs more.

## Decision

A passwordless passkey login asks no further factor, and one passkey proof is a whole re-authentication in place of the password and a code.

## Considered options

- a passkey alone suffices (chosen)
- TOTP or a backup code after a passkey: rejected, it asks a second proof of what the passkey already proved.
- a passkey standing for the code only: rejected, the password would still be asked though the passkey proves more.

## Consequences

- Every passkey ceremony requires user verification.
- `UserAuthService.assertReauthentication` skips the password and code for a passkey proof.
