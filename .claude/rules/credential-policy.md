---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/user/services/**'
    - 'src/modules/user/use-cases/**'
    - 'src/modules/session/services/**'
    - 'src/modules/session/use-cases/**'
    - 'src/modules/device/services/**'
    - 'src/modules/device/use-cases/**'
    - 'src/modules/notification/services/**'
    - 'src/modules/notification/use-cases/**'
    - 'src/modules/mfa/services/**'
    - 'src/modules/mfa/use-cases/**'
    - 'src/modules/password-history/**'
    - 'src/configs/mfa.config.ts'
    - 'src/configs/verification.config.ts'
    - 'src/configs/forgot-password.config.ts'
---

# Credential policy

MFA: `mfa.md`. Sessions: `session.md`. Sign-in: `login.md`. Hashing: `security.md`.

## Passwords

- A new password (sign-up, change, reset) is 8 to 64 characters of any composition and passes `AuthPasswordService.assertAllowed`: absent from `CommonPassword`, case-insensitive, and free of every context word of `auth.password.contextWordMinLength` characters or more (app name, email local part, username, name, each split on non-alphanumerics). An admin-generated password skips it.
- Only an admin-issued temporary password expires, `auth.password.temporaryExpiresInMs` after issue; a password the user sets has no expiry. The password history and its reuse period apply to every new password.

## Re-authentication

- Each flow of `EnumUserReauthenticationAction` sequences the proof in its use case before its work, over the `user` part (`UserAuthService`) and the `mfa` part (`MfaService`, `mfa.md`); each check writes nothing:
    1. the password check, `checkReauthenticationPassword`; a mismatch commits its count in a transaction of its own (`countFailedReauthenticationInTx`, adding `userReauthenticationFailed`, never `userLoginFailed`) and throws through `throwFailedReauthentication`;
    2. `MfaService.checkReauthentication`; a mismatch commits its count (`MfaService.countFailedAttemptInTx`, adding `userMfaVerificationFailed`) and throws through `MfaService.throwFailedAttempt` (ASVS 16.3.1);
    3. `UserAuthService.getReauthenticationVerificationId`, the email code's id for an account with neither proof;
    4. on a match, first in the flow's one transaction, which it opens: `UserAuthService.completeReauthenticationInTx`, then `MfaService.completeReauthenticationInTx`.
- The proof is the current password when the account has one, plus a TOTP or backup code when MFA is on (`MfaService.check`). One passkey proof against a `reauthentication` challenge is the whole proof, for every action. `mfaTotpEnable` proves the new authenticator and skips the MFA proof only after a password check: an account with no password and MFA on proves a passkey or a backup code there (`backupCode` on the enable request). Logout of the caller's own session takes none.
- A mismatch counts on its own budget (`mfa.md`).
- An account with no password and MFA off proves itself with an email code: `POST /shared/user/reauthentication/send` with the flow's action, refused for an account with a stronger proof. The code is bound to that action, works once within `verification.expiresInMinutes`, and stays valid after a wrong attempt; its resend window counts the latest code per user and action, used or not. The `reauthenticationOtp` kind is mandatory and email only.

## Retention

- Each owning module's daily `purgeExpired` (`queue.md`, Enqueuing) deletes a `PasswordHistory` row once past its `expiredAt`, the end of its reuse period, and an `MfaChallenge`, `Verification`, or `ForgotPassword` row `mfa.challengeRetentionInMs`, `verification.retentionInMs`, or `forgotPassword.retentionInMs` after its `expiredAt`.
- The verification and reset retentions stay no shorter than `analytic.maxWindowInMs`: admin cards count those rows over that window.
