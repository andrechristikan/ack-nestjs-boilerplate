# 0069. Backup codes follow the first and last factor

- Status: accepted
- Date: 2026-11-15

## Context

Backup codes recover a user who lost their factor. With two factor kinds, they need a lifecycle that does not depend on one kind.

## Decision

Enabling the first factor, TOTP or passkey, writes the backup codes and answers them once; removing the last factor empties them. Every user has one `Mfa` row holding them.

## Considered options

- codes follow the first and last factor (chosen)
- backup codes for TOTP only: rejected, a passkey-only user would have no recovery.

## Consequences

- `MfaService.createBackupCodesInTx` answers codes only when the row holds none.
- Regeneration stays available while MFA is on.
