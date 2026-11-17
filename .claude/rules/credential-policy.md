---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/user/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/notification/**'
    - 'src/modules/mfa/**'
---

# Credential policy

Passwords, the inactivity of a credential, and re-authentication. MFA and sessions: `session.md`. Sign-in: `login.md`. Hashing: `security.md`.

## Passwords

- A new password (sign-up, change, reset) is 8 to 64 characters of any composition and passes `AuthPasswordService.assertAllowed`: absent from `CommonPassword`, case-insensitive, and free of every context word of `auth.password.contextWordMinLength` characters or more (app name, email local part, username, name, each split on non-alphanumerics). An admin-generated password skips it.
- Only an admin-issued temporary password expires, `auth.password.temporaryExpiresInMs` after issue; a password the user sets has no expiry. The password history and its reuse period apply to every new password.

## Re-authentication

- Each flow of `EnumUserReauthenticationAction` calls `UserAuthService.assertReauthentication` before its work, writing nothing on a match, and `completeReauthenticationInTx` first in the flow's one transaction. The use case opens that transaction and maps its write conflicts.
- The proof is the current password when the account has one, plus a TOTP or backup code when MFA is on (`MfaService.check`). One passkey proof against a `reauthentication` challenge is the whole proof, for every action. `mfaTotpEnable` proves the new authenticator and skips the MFA proof only after a password check: an account with no password and MFA on proves a passkey or a backup code there (`backupCode` on the enable request). Logout of the caller's own session takes none.
- A mismatch counts on its own budget (`session.md`, MFA). An MFA proof completes through `MfaService.completeInTx`, which consumes a backup code, and the `userVerifyMfa` entry.
- An account with no password and MFA off proves itself with an email code: `POST /shared/user/reauthentication/send` with the flow's action, refused for an account with a stronger proof. The code is bound to that action, works once within `verification.expiresInMinutes`, and stays valid after a wrong attempt; its resend window counts the latest code per user and action, used or not. The `reauthenticationOtp` kind is mandatory and email only.
