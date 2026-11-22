---
paths:
    - 'src/modules/user/services/**'
    - 'src/modules/user/use-cases/**'
    - 'src/modules/user/guards/**'
    - 'src/modules/auth/services/**'
    - 'src/modules/auth/use-cases/**'
    - 'src/modules/auth/guards/**'
    - 'src/modules/workspace/services/**'
    - 'src/modules/workspace/use-cases/**'
    - 'src/configs/user.config.ts'
    - 'src/configs/auth.config.ts'
    - 'src/modules/mfa/services/**'
    - 'src/modules/mfa/use-cases/**'
    - 'src/configs/mfa.config.ts'
---

# Sign-in and accounts

MFA: `mfa.md`. Sessions: `session.md`. Role rank and policies: `role.md`. Passwords and re-authentication: `credential-policy.md`.

`AuthSocialService` verifies Google with `audience` set to its client id and Apple against the set client ids; an unset provider throws its not-configured exception first, rethrown unwrapped by `AuthService`. A login stamps the last login inside its transaction (`UserService.updateLoginInTx`). Each login use case upserts the device in that transaction (`DeviceService.upsertForLoginInTx`) and hands the result to `UserAuthService.createTokenAndSessionInTx`.

- `blocked` is final: no admin action on the account, a status change included, touches a blocked user, and an admin ownership transfer moves a workspace away from one (`transaction.md`, Queries); `inactive` is reversible.
- Login answers one invalid-credential error for an unknown email, a wrong password, and an inactive account. Forgot-password and resend-verification answer 200 in every account state, sending only when the account is eligible and outside the resend window (`forgotPassword.resendInMinutes`, `verification.resendInMinutes`). While SES is unset, both answer 501 `AwsSesNotConfiguredException` for every caller, before the account is read. That answer says nothing about the account. 403 answers a spent attempt budget (`UserPasswordAttemptMaxException`, `MfaAttemptMaxException`).
- A credential login whose password matches an active, unverified account (`UserUtil.isUnverified`) sends a verification email when `UserVerificationService.isEmailResendable(user)` holds, then throws `UserEmailNotVerifiedException`, email sent or not. That gate is false for a verified user or inside `verification.resendInMinutes`. The check runs after the password matched and before the password-expiry check, so an unverified account with an expired password still gets the email.
- That login records `userVerificationEmailSent` only when it sends: the verification record, the `verificationEmail` effect (`notify.md`), and the entry share one transaction, committed before the throw.
- Password expiry gates credential logins only; `UserGuard` skips it when the access token's `loginWith` is not `credential`.
- A social login that matches an unverified credential account by the provider-verified email verifies that account and clears its password in one write, which leaves the email owner the sole credential holder.
- A social login finds its user by `(provider, subject)` in `UserSocial`, never by email. With no link for the subject, the provider-verified email finds the account, or creates it where sign-up is allowed, and the login's transaction creates the link; an account that already holds a link for that provider answers the provider's invalid exception. Self-delete removes the links.
- A social ID token carries a nonce the API issued. Verification deletes its `AuthSocialNonce` row with one `deleteMany` on the hash and a live expiry, whatever the login's outcome; a missing, unknown, expired, or used nonce answers `AuthSocialNonceInvalidException`. Issuing a nonce deletes the expired rows; no scheduled job purges them.
- An admin-created or imported user is verified at create, whatever the role; the temporary password reaches only that inbox.
- Admin import and admin export are jobs: each route answers with its `outboxId`. The admin is notified with `userImportResult` or `userExportResult`; the export's email carries the download link and its in-app notification none.
- A passwordless change-password sets the first password.
- A passkey alone signs a user in (`UserLoginWithPasskeyUseCase`): the credential login's account checks, no further factor, `loginWith: passkey`. The `loginWithPasskey` flag alone gates it (`MfaService.checkPasskeyLogin` reads no `mfa` flag); registering a passkey reads the `mfa` flag and its `passkeyAllowed`, never `loginWithPasskey`.
- A password reset on an account with MFA on proves one enrolled method, a passkey included.
- A mobile-number verification send inside `verification.resendInMinutes` answers 200 and sends nothing.
- Self-delete validates, consumes the re-authentication proof, and queues the `deleteSelf` job on the `user` queue; the account and its sessions stay live until the job commits. In one transaction the job rewrites `email` and `username` to `deleted.<id>` (`user.deleteSelf.emailPattern`, `usernamePattern`), a value no sign-up accepts, which frees both for registration, clears the credential and personal columns (`UserRepository.deleteSelfInTx`), and deletes the password history (`PasswordHistoryService.removeByUserInTx`); the hash never stays on the deleted row. An `admin` or `superAdmin` account cannot delete itself.
- `UserUtil.hasBadWord` replaces every run of characters outside `a-z` and `A-Z` with one space and matches whole words: a word inside a longer token passes.
- A user who owns a workspace with any other member cannot delete their account until they transfer ownership. A workspace with no other member is deleted in the deletion job's transaction (`WorkspaceService.softDeleteInTx`), and the job pages its projects after the commit (`use-case.md`, Jobs).

## Use-case groups

The user module's sign-in and sign-up flows are two groups of use cases:

- sign-in: `UserLoginCredentialUseCase`, `UserLoginWithSocialUseCase` with its first-login sign-up, `UserLoginVerifyMfaUseCase`, and `UserLoginWithPasskeyUseCase` share `UserAuthService` (`user.auth.service.ts`); `UserLoginGeneratePasskeyUseCase`, `UserRefreshUseCase`, and `UserLogoutUseCase` belong to the group and need none of it.
- sign-up: `UserSignUpUseCase`, `UserCreateByAdminUseCase`, `UserImportByAdminUseCase` with `UserProcessImportByAdminUseCase`.

A service, util, interface, config key, or service method one flow uses takes that flow's concern, `auth` (sign-in, `IUserAuth*`) or `registration` (sign-up, `IUserRegistration*`); one both flows use takes its action concern, a config group included (`user.create` holds `timeoutInMs` and `bulkTimeoutInMs`). A predicate on the user row itself stays in `UserUtil` (`UserUtil.isUnverified`). `onboarding` names nothing in the user module.
