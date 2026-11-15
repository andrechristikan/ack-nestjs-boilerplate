---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/user/**'
    - 'src/modules/role/**'
    - 'src/modules/policy/**'
    - 'src/modules/term-policy/**'
    - 'src/modules/api-key/**'
    - 'src/modules/workspace/**'
    - 'src/modules/project/**'
---

# Authentication and authorization

Credentials, cryptography, and the request store: `security.md`.

## Two-factor

`TwoFactor.secret` holds only a confirmed authenticator, encrypted with the two-factor root and the user id. Setup writes `pendingSecret`; confirming moves it into `secret`; disable clears both; an admin reset clears both, keeps `enabled`, and sets `requiredSetup`: the next login enrolls a new authenticator, and until then every flow that verifies 2FA skips verification. Setup while enabled proves 2FA with a backup code; a missing one counts as invalid. A missing or undecryptable secret raises `AuthTwoFactorSecretUnavailableException` (409).

- An attempt counts failures only: the flow asserts no lock (`UserPasswordService.assertPasswordAttemptAvailable`, `UserTwoFactorService.assertAttemptAvailable`), checks the credential without writing, and on a mismatch counts in its own transaction (`countFailedPasswordAttempt`, `countFailedAttempt`), then throws; a missing method throws uncounted. A match resets counter and lock inside the flow's transaction (`resetPasswordAttemptInTx`, `verifyInTx`, `verifySetupCodeInTx`).
- The failure reaching `maxAttempt` zeroes the counter, sets `passwordLockedUntil` or `TwoFactor.lockedUntil` `lockDurationInMs` ahead, and adds the `userReachMax…Attempt` entry and the mandatory `loginLocked` notification. A lock throws the max-attempt exception, touches no status, session, or device, and opens with the clock. A reactivation clears both locks, a password write the password lock, an admin two-factor reset the two-factor lock.
- `TwoFactor.lastUsedStep` accepts each TOTP step once.
- The login challenge is a `TwoFactorChallenge` row created in the login's transaction. `UserLoginSetupTwoFactorUseCase` reads it without consuming it; `UserLoginVerifyTwoFactorUseCase` claims it with a guarded `updateMany` inside the transaction that records the verification and creates the session.

## Session invalidation

Password change (every session but the caller's) or reset, logout, device removal, self-deletion, two-factor disable or admin reset, a status change to `blocked` or `inactive`, refresh-token reuse, an admin revoke of one or all sessions, and a login on a device another user is signed in to each revoke the session rows; the revoking `SessionService` `*InTx` method adds the session cache purge row to the revoke's transaction (`outbox.md`). A revocation reaches the guard's session cache when the purge job runs (`cache.md`). The purge job carries the user id and the exact `ISessionRef[]` revoked, whose login keys `SessionService.deleteLogins` invalidates, never a key pattern. The revoke's activity entries share its transaction (`activity-log.md`). Create and the rotation stamp `Session.lastActiveAt`; a session idle beyond `session.idleTimeoutInMs` is dead, so every live-session read and the rotation carry `lastActiveAt` beside `expiredAt`. Every revoke and rotation `where` carries `isRevoked: false`; a revoke's `where` ignores both bounds, except the refresh's reuse revoke (`SessionService.revokeReusedInTx`), which carries them, so an idle refresh revokes nothing. A password write (change, reset, admin reset) marks the user's unused `ForgotPassword` rows used, inside its transaction.

- A refresh is one transaction: a guarded `updateMany` swaps the old `jtiDigest` for the new one, then the login stamp and `DeviceOwnership.lastActiveAt`; a miss is reuse, revoked in the same transaction. The rotation writes no cache: the new token's first request reloads the entry. A retry of a lost response with the old token is reuse, an accepted trade-off.
- A device holds one signed-in user. A login, inside its transaction, revokes every live session of every other user whose `DeviceOwnership` points at the same `Device`, its `where` carrying `isRevoked: false` and ignoring `expiredAt` as every revoke's does; the revoke adds one purge row per affected user with the exact `ISessionRef[]` revoked for that user. Their `DeviceOwnership` rows stay unrevoked: the device stays in their list, with no live session and, once the purge job runs, no push token. Each affected user gets one activity row under a dedicated action; the logging-in user's login row is unchanged. No notification goes to an affected user.

## Sign-in and authorization

`AuthSocialService` verifies Google with `audience` set to its client id and Apple against the set client ids; an unset provider throws its not-configured exception first, rethrown unwrapped by `AuthService`. CASL abilities come from the caller's role's `Policy` rows; `@PolicyProtected` names subject and actions. A login stamps the last login inside its transaction (`UserService.updateLoginInTx`).

- Role rank is `superAdmin > admin > user` (`EnumRoleType`). An admin-facing write on a role, its policies, or a user (create, role, status, password reset, 2FA reset) refuses a target ranked at or above the actor, except a superAdmin actor on a superAdmin target. No actor edits the role they hold or its policies. A role request DTO's `type` is `admin` or `user`.
- Policies belong to admin-type roles: a policy create or update on a `user`-type role, and a role type change to `user` while it holds a policy, are refused; `RoleGuard` stores no policy for a `user` or `superAdmin` role.
- `blocked` is final: no admin action, a status change included, touches a blocked user; `inactive` is reversible.
- A role with `isImmutable` true cannot be deleted and its `type` cannot change, whoever the actor is. Its `description` and policies stay editable under the rank gates. The role seed alone sets the field, true on `superadmin`, `admin`, and `user`; no request DTO, `IRoleCreate`, or `IRoleUpdate` carries it. `user.default.role` names the sign-up role, one of those immutable roles.
- The term-policy guard compares the user's `TermPolicyUserAcceptance` rows with the latest published policy per required type; a type with no published version needs no acceptance and makes sign-up throw a term-policy exception. Publishing a version archives every earlier published one of its type; readers take the latest published row per type. No per-user acceptance flag, no reset on publish.
- Login answers one invalid-credential error for an unknown email, a wrong password, and an inactive account. Forgot-password and resend-verification answer 200 in every account state, sending only when the account is eligible and outside the resend window (`forgotPassword.resendInMinutes`, `verification.resendInMinutes`). 403 answers a spent attempt budget (`UserPasswordAttemptMaxException`, `AuthTwoFactorAttemptMaxException`).
- A credential login whose password matches an active, unverified account (`UserUtil.isUnverified`) sends a verification email when `UserVerificationService.isEmailResendable(user)` holds, then throws `UserEmailNotVerifiedException`, email sent or not. That gate is false for a verified user or inside `verification.resendInMinutes`; `getOneForResendByEmail` calls it too. The check runs after the password matched and before the password-expiry check, so an unverified account with an expired password still gets the email.
- That login records `userSendVerificationEmail` only when it sends: the verification record, the `verificationEmail` effect (`notification.md`), and the entry share one transaction, committed before the throw.
- Only an admin-issued temporary password expires (`credential-policy.md`). Password expiry gates credential logins only; `UserGuard` skips it when the access token's `loginWith` is social.
- A social login that matches an unverified credential account by the provider-verified email verifies that account and clears its password in one write, which leaves the email owner the sole credential holder.
- An admin-created or imported user is verified at create, whatever the role; the temporary password reaches only that inbox.
- Every sensitive flow re-authenticates (`credential-policy.md`); a passwordless change-password sets the first password.
- `loginSetupTwoFactor` takes the login challenge and no password.
- Self-delete rewrites `email` and `username` from the row id, which frees both for registration. An `admin` or `superAdmin` account cannot delete itself.
- A user who owns a workspace with any other member cannot delete their account until they transfer ownership. A workspace with no other member is deleted with the account.
