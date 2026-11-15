---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/user/**'
    - 'src/modules/mfa/**'
    - 'src/modules/role/**'
    - 'src/modules/policy/**'
    - 'src/modules/term-policy/**'
    - 'src/modules/api-key/**'
    - 'src/modules/workspace/**'
    - 'src/modules/project/**'
---

# Authentication and authorization

Credentials, cryptography, and the request store: `security.md`.

## MFA

Factors: TOTP (`MfaTotp`) and passkey (`MfaPasskey`); backup codes recover either. MFA is on while a confirmed TOTP or a passkey exists. Every user has one `Mfa` row, created with the user, holding the counter, the lock, and the backup codes; the codes are written when the first factor is enabled and emptied when the last is removed.

- `MfaTotp.secret` holds only a confirmed authenticator, encrypted with the MFA root and the user id; setup is refused while it is set. `lastUsedStep` accepts each TOTP step once.
- A passkey assertion passes only for its user's credential with a counter above the stored one, or 0 on both sides.
- Attempts count failures only, one budget for every method: assert no lock (`UserPasswordService.assertPasswordAttemptAvailable`, `MfaService.assertAttemptAvailable`), check without writing, count a mismatch in its own transaction (`countFailedPasswordAttempt`, `MfaService.countFailedAttempt`), then throw; a missing method throws uncounted. Only `MfaService` counts. A match resets inside the flow's transaction (`resetPasswordAttemptInTx`, `MfaService.completeInTx`).
- The failure reaching `maxAttempt` zeroes the counter, sets `passwordLockedUntil` or `Mfa.lockedUntil` `lockDurationInMs` ahead, and adds the `userReachMax…Attempt` entry and the mandatory `loginLocked` notification. A lock touches no status, session, or device and opens with the clock. A reactivation clears both locks, a password write the password lock, an admin MFA reset the MFA lock.
- An `MfaChallenge` row has one purpose and one user (none for `passwordless`); the flow it proves claims it once with a guarded `updateMany` inside its transaction.
- A passkey proof needs no further factor: a passkey login and a re-authentication take it alone.
- A forgot-password reset of a user with MFA proves one method.
- An admin MFA reset deletes every factor, clears the codes, counter, and lock, and revokes every session.

## Session invalidation

Password change, TOTP disable, and passkey delete (every session but the caller's), password reset, logout, device removal, self-deletion, an admin MFA reset, a status change to `blocked` or `inactive`, refresh-token reuse, an admin revoke of one or all sessions, and a login on a device another user is signed in to each revoke the session rows; the revoking `SessionService` `*InTx` method adds the session cache purge row to the revoke's transaction (`outbox.md`). A revocation reaches the guard's session cache when the purge job runs (`cache.md`). The purge job carries the user id and the exact `ISessionRef[]` revoked, whose login keys `SessionService.deleteLogins` invalidates, never a key pattern. The revoke's activity entries share its transaction (`activity-log.md`). Every revoke and rotation `where` carries `isRevoked: false`; a revoke's `where` ignores `expiredAt`. A password write (change, reset, admin reset) marks the user's unused `ForgotPassword` rows used, inside its transaction.

- A refresh is one transaction: a guarded `updateMany` swaps the old `jtiDigest` for the new one, then the login stamp and the device's `lastActiveAt`; a miss is reuse, revoked in the same transaction. The rotation writes no cache: the new token's first request reloads the entry. A retry of a lost response with the old token is reuse, an accepted trade-off.
- A device holds one signed-in user. A login, inside its transaction, revokes every live session of every other user whose `DeviceOwnership` points at the same `Device`; the revoke adds one purge row per affected user with the exact `ISessionRef[]` revoked for that user. Their `DeviceOwnership` rows stay unrevoked. Each affected user gets one activity row under a dedicated action; the logging-in user's login row is unchanged. No notification goes to an affected user.

## Sign-in and authorization

`AuthSocialService` verifies Google with `audience` set to its client id and Apple against the set client ids; an unset provider throws its not-configured exception first, rethrown unwrapped by `AuthService`. CASL abilities come from the caller's role's `Policy` rows; `@PolicyProtected` names subject and actions. A login stamps the last login inside its transaction (`UserService.updateLoginInTx`).

- Role rank is `superAdmin > admin > user`. An admin-facing write on a role, its policies, or a user (create, role, status, password reset, MFA reset) refuses a target ranked at or above the actor, except a superAdmin actor on a superAdmin target. No actor edits the role they hold or its policies. A role request DTO's `type` is `admin` or `user`.
- Policies belong to admin-type roles: a policy create or update on a `user`-type role, and a role type change to `user` while it holds a policy, are refused; `RoleGuard` stores no policy for a `user` or `superAdmin` role.
- `blocked` is final: no admin action, a status change included, touches a blocked user; `inactive` is reversible.
- A role with `isImmutable` true cannot be deleted and its `type` cannot change, whoever the actor is. Its `description` and policies stay editable under the rank gates. The role seed alone sets the field, true on `superadmin`, `admin`, and `user`; no request DTO, `IRoleCreate`, or `IRoleUpdate` carries it. `user.default.role` names the sign-up role, one of those immutable roles.
- The term-policy guard compares the user's `TermPolicyUserAcceptance` rows with the latest published policy per required type; a type with no published version needs no acceptance and makes sign-up throw a term-policy exception. Publishing a version archives every earlier published one of its type; readers take the latest published row per type. No per-user acceptance flag, no reset on publish.
- Login answers one invalid-credential error for an unknown email, a wrong password, and an inactive account. Forgot-password and resend-verification answer 200 in every account state, sending only when the account is eligible and outside the resend window (`forgotPassword.resendInMinutes`, `verification.resendInMinutes`). 403 answers a spent attempt budget (`UserPasswordAttemptMaxException`, `MfaAttemptMaxException`).
- A credential login whose password matches an active, unverified account (`UserUtil.isUnverified`) sends a verification email when `UserVerificationService.isEmailResendable(user)` holds, then throws `UserEmailNotVerifiedException`, email sent or not. That gate is false for a verified user or inside `verification.resendInMinutes`; `getOneForResendByEmail` calls it too. The check runs after the password matched and before the password-expiry check, so an unverified account with an expired password still gets the email.
- That login records `userSendVerificationEmail` only when it sends: the verification record, the `verificationEmail` effect (`notification.md`), and the entry share one transaction, committed before the throw.
- Password expiry gates credential logins only; `UserGuard` skips it when the access token's `loginWith` is social.
- A social login that matches an unverified credential account by the provider-verified email verifies that account and clears its password in one write, which leaves the email owner the sole credential holder.
- An admin-created or imported user is verified at create, whatever the role; the temporary password reaches only that inbox.
- Self-delete, change-password, and every MFA write but a passkey rename require the current password of an account that has one, or one passkey proof. A passwordless account relies on its session, and change-password sets its first password.
- Self-delete rewrites `email` and `username` from the row id, which frees both for registration. An `admin` or `superAdmin` account cannot delete itself.
- A user who owns a workspace with any other member cannot delete their account until they transfer ownership. A workspace with no other member is deleted with the account.
