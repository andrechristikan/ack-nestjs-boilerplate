# 0065. Biometric sign-in is a WebAuthn passkey

- Status: accepted
- Date: 2026-11-15

## Context

The owner wanted biometric sign-in. A server never sees a fingerprint or a face: biometrics only unlock a key on the device, so the choice is how that key is made and verified.

## Decision

Biometric sign-in is a WebAuthn passkey verified by `@simplewebauthn/server` in `MfaPasskeyService`. One factor covers Face ID, fingerprint, Windows Hello, and a security key.

## Considered options

- a WebAuthn passkey through `@simplewebauthn/server` (chosen)
- a hand-made device key pair on `DeviceOwnership`: rejected, it duplicates WebAuthn without its origin check, browser support, or security keys.
- both as separate factors: rejected, two code paths for one mechanism.
- WebAuthn on `node:crypto`: rejected, parsing CBOR, COSE, and attestation by hand is a larger risk than a maintained library.

## Consequences

- Registration and assertion require user verification; registration requires a resident key.
- The `biometric*` columns of `DeviceOwnership` and `EnumBiometricType` are removed.
- A passkey may sync across a user's devices; no rule binds it to one device.
