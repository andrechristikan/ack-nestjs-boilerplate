---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/user/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/notification/**'
---

# Credential policy

Passwords, the inactivity of a credential, and re-authentication. Two-factor, sessions, and sign-in: `auth.md`. Hashing: `security.md`.

## Passwords

- A new password (sign-up, change, reset) is 8 to 64 characters of any composition and passes `AuthPasswordService.assertAllowed`: absent from `CommonPassword`, case-insensitive, and free of every context word of `auth.password.contextWordMinLength` characters or more (app name, email local part, username, name, each split on non-alphanumerics). An admin-generated password skips it.
- Only an admin-issued temporary password expires, `auth.password.expiredTemporaryInMs` after issue; a password the user sets has no expiry. The password history and its reuse period apply to every new password.

## Re-authentication

- Each flow of `EnumUserReauthenticationAction` calls `UserAuthService.assertReauthentication` before its work, writing nothing on a match, and `completeReauthenticationInTx` first in the flow's one transaction. The use case opens that transaction and maps its write conflicts.
- The proof is the current password when the account has one, plus a TOTP or backup code when 2FA requires verification. 2FA enable proves the new authenticator, no old one. Logout of the caller's own session takes none.
- A mismatch counts on its own budget (`auth.md`, Two-factor). A two-factor proof completes through `verifyInTx` and `recordVerificationInTx`, which consumes a backup code, and the `userVerifyTwoFactor` entry.
- An account with no password and no 2FA proves itself with an email code: `POST /shared/user/reauthentication/send` with the flow's action, refused for an account with a stronger proof. The code is bound to that action, works once within `verification.expiredInMinutes`, and stays valid after a wrong attempt; its resend window counts the latest code per user and action, used or not. The `reauthenticationOtp` kind is mandatory and email only.
