# 0020. Security alert snapshot

- Status: accepted
- Date: 2026-11-07

## Context

A credential reset revokes the live sessions of the user. A processor that resolves the recipient after the revoke finds no live session to read.

## Decision

`temporaryPasswordByAdmin`, `resetPassword`, and `resetTwoFactorByAdmin` snapshot the encrypted tokens of the devices with a live session and the user's encrypted email, read before the revoke inside the same transaction. The three kinds are mandatory.

## Considered options

- the three credential-reset kinds snapshot live-session tokens before the revoke and are mandatory (chosen)
- resolving after the revoke: rejected, the revoke destroys the live-session set, so the alert would reach nothing.
- every registered device: rejected, a logged-out device's token is already cleared, so no wider set exists.
- honouring opt-outs on a credential reset: rejected, best practice treats a credential-reset alert as not optional.

## Consequences

The alert reaches every device signed in at that moment, an attacker's included.
