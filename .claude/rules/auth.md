---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/user/**'
    - 'src/modules/role/**'
    - 'src/modules/policy/**'
    - 'src/modules/term-policy/**'
---

# Authentication and authorization

Credentials, cryptography, and the request store: `security.md`.

## Two-factor

`TwoFactor.secret` holds only a confirmed authenticator, encrypted with the two-factor root and the user id. Setup writes `pendingSecret`; confirming moves it into `secret`; disable clears both; an admin reset clears both, keeps `enabled`, and sets `requiredSetup`: the next login enrolls a new authenticator, and until then the flows that verify 2FA (password reset, change-password) skip verification. Setup while enabled consumes a valid backup code by compare-and-set on the stored list, committed before a token is issued. A missing or undecryptable secret raises `AuthTwoFactorSecretUnavailableException` (409).

- A two-factor attempt runs the password attempt flow: a missing method throws its required exception without counting; a guarded increment (`updateMany` `where attempt < max`) decides; the service counts and, on a spent budget, enqueues the lockout (`UserPasswordService.countPasswordAttempt`, `UserTwoFactorService.countAttempt`, Session invalidation) and returns its activity stages as data; the use case stages them, asserts, then verifies. An admin reactivation resets the password and two-factor counters.
- `TwoFactor.lastUsedStep` accepts each TOTP step once.
- `UserLoginSetupTwoFactorUseCase` reads the challenge without consuming it; only `UserLoginVerifyTwoFactorUseCase` claims it, after verification succeeds (`cache.md`).

## Session invalidation

Password change or reset, logout, device removal, self-deletion, two-factor disable or admin reset, a status change to `blocked` or `inactive`, refresh-token reuse, an admin revoke of one or all sessions, and a login on a device another user is signed in to each revoke the session rows and enqueue the session cache purge; the JWT guards read the cache, so revocation lands when the job runs. The purge job carries the user id and the exact `ISessionRef[]` the revoke returned, which `SessionCache.deleteLogins` deletes, never a key pattern. Order: commit, enqueue the purge, stage the activity rows. Every revoke and rotation `where` carries `isRevoked: false`; a revoke's `where` ignores `expiredAt`. A password write (change, reset, admin reset) marks the user's unused `ForgotPassword` rows used, inside its transaction.

- A spent password or two-factor attempt budget throws its max-attempt exception at once and enqueues `UserQueue.lockout(userId)`: job `lockout` on the `user` queue, payload `{ userId }`; every spent budget enqueues its own job. The use case stages the `userReachMax…Attempt` and `userRevokeAllSessions` rows the count returns. `UserProcessLockoutUseCase` runs one transaction, the guarded deactivate (stop when already inactive), the session revoke, and the device revoke, then enqueues the session cache purge after commit.
- A refresh rotates by compare-and-set on the old `jti` in the database `where` and the cache write; a mismatch is reuse: revoke the session, enqueue its purge. A retry of a lost response with the old token is reuse, an accepted trade-off.
- A device holds one signed-in user. A login, inside its transaction, revokes every live session of every other user whose `DeviceOwnership` points at the same `Device`, its `where` carrying `isRevoked: false` and ignoring `expiredAt` as every revoke's does; after commit it enqueues one `SessionQueue.purgeLogins` per affected user with the exact `ISessionRef[]` revoked for that user. Their `DeviceOwnership` rows stay unrevoked: the device stays in their list, with no live session and, once the purge job runs, no push token. Each affected user gets one activity row under a dedicated action; the logging-in user's login row is unchanged. No notification goes to an affected user.

## Sign-in and authorization

`AuthSocialService` verifies Google with `audience` set to its client id and Apple against the set client ids; an unset provider throws its not-configured exception first, rethrown unwrapped by `AuthService`. CASL abilities come from the caller's role's `Policy` rows; `@PolicyProtected` names subject and actions. A login stamps the last login inside its transaction (`UserService.updateLoginInTx`).

- Role rank is `superAdmin > admin > user` (`EnumRoleType`). An admin-facing write on a role, its policies, or a user (create, role, status, password reset, 2FA reset) refuses a target ranked at or above the actor, except a superAdmin actor on a superAdmin target. No actor edits the role they hold or its policies. A role request DTO's `type` is `admin` or `user`.
- `blocked` is final: no admin action, a status change included, touches a blocked user; `inactive` is reversible.
- A role with `isImmutable` true cannot be deleted and its `type` cannot change, whoever the actor is. Its `description` and policies stay editable under the rank gates. The role seed alone sets the field, true on `superadmin`, `admin`, and `user`; no request DTO, `IRoleCreate`, or `IRoleUpdate` carries it. `user.default.role` names the sign-up role, one of those immutable roles.
- The term-policy guard compares the user's `TermPolicyUserAcceptance` rows with the latest published policy per required type; a type with no published version needs no acceptance and makes sign-up throw a term-policy exception. Publishing a version archives every earlier published one of its type; readers take the latest published row per type. No per-user acceptance flag, no reset on publish.
- Login answers one invalid-credential error for an unknown email, a wrong password, and an inactive account. Forgot-password and resend-verification answer 200 in every account state, sending only when the account is eligible and outside the resend window (`forgotPassword.resendInMinutes`, `verification.resendInMinutes`). 403 answers a spent attempt budget (`UserPasswordAttemptMaxException`, `AuthTwoFactorAttemptMaxException`).
- A credential login whose password matches an active, unverified account (`UserUtil.isUnverified`) sends a verification email when `UserVerificationService.isEmailResendable(user)` holds, then throws `UserEmailNotVerifiedException`, email sent or not. That gate is false for a verified user or inside `verification.resendInMinutes`; `getOneForResendByEmail` calls it too. The check runs after the password matched and before the password-expiry check, so an unverified account with an expired password still gets the email.
- That login stages `userSendVerificationEmail` only when it sends: it writes the verification record, stages the row, then enqueues the email as a side effect after the write (`queue.md`, Enqueuing). The staged row survives the throw because the flush runs on the error path (`activity-log.md`).
- Password expiry gates credential logins only; `UserGuard` skips it when the access token's `loginWith` is social.
- A social login that matches an unverified credential account by the provider-verified email verifies that account and clears its password in one write, which leaves the email owner the sole credential holder.
- An admin-created or imported user is verified at create, whatever the role; the temporary password reaches only that inbox.
- Self-delete, change-password, 2FA setup, and 2FA enable require the current password of an account that has one, whether 2FA is on or off. A passwordless account relies on its session, and change-password sets its first password.
- `loginSetupTwoFactor` takes the login challenge and no password.
- Self-delete rewrites `email` and `username` from the row id, which frees both for registration. An `admin` or `superAdmin` account cannot delete itself.
- A user who owns a workspace with any other member cannot delete their account until they transfer ownership. A workspace with no other member is deleted with the account.
