---
paths:
    - 'src/modules/user/**'
    - 'src/modules/auth/**'
    - 'src/modules/workspace/**'
    - 'src/configs/user.config.ts'
    - 'src/configs/auth.config.ts'
---

# Sign-in and accounts

Two-factor and sessions: `session.md`. Role rank and policies: `role.md`. Passwords and re-authentication: `credential-policy.md`.

`AuthSocialService` verifies Google with `audience` set to its client id and Apple against the set client ids; an unset provider throws its not-configured exception first, rethrown unwrapped by `AuthService`. A login stamps the last login inside its transaction (`UserService.updateLoginInTx`).

- `blocked` is final: no admin action, a status change included, touches a blocked user; `inactive` is reversible.
- Login answers one invalid-credential error for an unknown email, a wrong password, and an inactive account. Forgot-password and resend-verification answer 200 in every account state, sending only when the account is eligible and outside the resend window (`forgotPassword.resendInMinutes`, `verification.resendInMinutes`). 403 answers a spent attempt budget (`UserPasswordAttemptMaxException`, `AuthTwoFactorAttemptMaxException`).
- A credential login whose password matches an active, unverified account (`UserUtil.isUnverified`) sends a verification email when `UserVerificationService.isEmailResendable(user)` holds, then throws `UserEmailNotVerifiedException`, email sent or not. That gate is false for a verified user or inside `verification.resendInMinutes`; `getOneForResendByEmail` calls it too. The check runs after the password matched and before the password-expiry check, so an unverified account with an expired password still gets the email.
- That login records `userSendVerificationEmail` only when it sends: the verification record, the `verificationEmail` effect (`notify.md`), and the entry share one transaction, committed before the throw.
- Only an admin-issued temporary password expires (`credential-policy.md`). Password expiry gates credential logins only; `UserGuard` skips it when the access token's `loginWith` is social.
- A social login that matches an unverified credential account by the provider-verified email verifies that account and clears its password in one write, which leaves the email owner the sole credential holder.
- A social login finds its user by `(provider, subject)` in `UserSocial`, never by email. With no link for the subject, the provider-verified email finds the account, or creates it where sign-up is allowed, and the login's transaction creates the link; an account that already holds a link for that provider answers the provider's invalid exception. Self-delete removes the links.
- A social ID token carries a nonce the API issued. Verification deletes its `AuthSocialNonce` row with one `deleteMany` on the hash and a live expiry, whatever the login's outcome; a missing, unknown, expired, or used nonce answers `AuthSocialNonceInvalidException`. Issuing a nonce deletes the expired rows; no scheduled job purges them.
- An admin-created or imported user is verified at create, whatever the role; the temporary password reaches only that inbox.
- Admin import is a job: the route answers with its `outboxId`, and the admin is notified with `userImportResult`. Export answers with the file.
- Every sensitive flow re-authenticates (`credential-policy.md`); a passwordless change-password sets the first password.
- `loginSetupTwoFactor` takes the login challenge and no password.
- Self-delete rewrites `email` and `username` from the row id, which frees both for registration. An `admin` or `superAdmin` account cannot delete itself.
- A user who owns a workspace with any other member cannot delete their account until they transfer ownership. A workspace with no other member is deleted with the account.

## Use-case groups

The user module's sign-in and sign-up flows are two groups of use cases:

- sign-in, sharing `UserAuthService` (`user.auth.service.ts`): `UserLoginCredentialUseCase`, `UserLoginWithSocialUseCase` with its first-login sign-up, `UserLoginVerifyTwoFactorUseCase`, `UserLoginSetupTwoFactorUseCase`, `UserRefreshUseCase`, `UserLogoutUseCase`.
- sign-up: `UserSignUpUseCase`, `UserCreateByAdminUseCase`, `UserImportByAdminUseCase`.

A util, interface, config key, or service method one flow uses takes that flow's concern, `auth` (sign-in) or `registration` (sign-up); one both use takes its action concern, a config group included (`user.create` holds `timeoutInMs` and `bulkTimeoutInMs`). `onboarding` names nothing in the user module.
