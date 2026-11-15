---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/user/**'
---

# Two-factor and sessions

Credentials, cryptography, and the request store: `security.md`. Sign-in and accounts: `login.md`. Roles and policies: `role.md`.

## Two-factor

`TwoFactor.secret` holds only a confirmed authenticator, encrypted with the two-factor root and the user id. Setup writes `pendingSecret`; confirming moves it into `secret`; disable clears both; an admin reset clears both, keeps `enabled`, and sets `requiredSetup`: the next login enrolls a new authenticator, and until then every flow that verifies 2FA skips verification. Setup while enabled proves 2FA with a backup code; a missing one counts as invalid. A missing or undecryptable secret raises `AuthTwoFactorSecretUnavailableException` (409).

- An attempt counts failures only: the flow asserts no lock (`UserPasswordService.assertPasswordAttemptAvailable`, `UserTwoFactorService.assertAttemptAvailable`), checks the credential without writing, and on a mismatch counts in its own transaction (`countFailedPasswordAttempt`, `countFailedAttempt`), then throws; a missing method throws uncounted. A match resets counter and lock inside the flow's transaction (`resetPasswordAttemptInTx`, `verifyInTx`, `verifySetupCodeInTx`).
- The failure reaching `maxAttempt` zeroes the counter, sets `passwordLockedUntil` or `TwoFactor.lockedUntil` `lockDurationInMs` ahead, and adds the `userReachMax…Attempt` entry and the mandatory `loginLocked` notification. A lock throws the max-attempt exception, touches no status, session, or device, and opens with the clock. A reactivation clears both locks, a password write the password lock, an admin two-factor reset the two-factor lock.
- Two-factor is opt-in per user, an accepted difference from ASVS 6.3.3. TOTP runs SHA-1, which ASVS lists as legacy, with `window` 1 (`auth.twoFactor.algorithm`, `auth.twoFactor.window`).
- `TwoFactor.lastUsedStep` accepts each TOTP step once.
- The login challenge is a `TwoFactorChallenge` row created in the login's transaction. `UserLoginSetupTwoFactorUseCase` reads it without consuming it; `UserLoginVerifyTwoFactorUseCase` claims it with a guarded `updateMany` inside the transaction that records the verification and creates the session.

## Session invalidation

Password change (every session but the caller's) or reset, logout, device removal, self-deletion, two-factor disable or admin reset, a status change to `blocked` or `inactive`, refresh-token reuse, an admin revoke of one or all sessions, and a login on a device another user is signed in to each revoke the session rows; the revoking `SessionService` `*InTx` method adds the session cache purge row to the revoke's transaction (`effects.md`). A revocation reaches the guard's session cache when the purge job runs (`cache.md`). The purge job carries the user id and the exact `ISessionRef[]` revoked, whose login keys `SessionService.deleteLogins` invalidates, never a key pattern. The revoke's activity entries share its transaction. Create and the rotation stamp `Session.lastActiveAt`; a session idle beyond `session.idleTimeoutInMs` is dead, so every live-session read and the rotation carry `lastActiveAt` beside `expiredAt`. Every revoke and rotation `where` carries `isRevoked: false`; a revoke's `where` ignores both bounds, except the refresh's reuse revoke (`SessionService.revokeReusedInTx`), which carries them, so an idle refresh revokes nothing. A password write (change, reset, admin reset) marks the user's unused `ForgotPassword` rows used, inside its transaction.

- The session login entry is a read-through cache in front of the `Session` row, `session.loginCacheTtlInMs`, kept shorter than the access token's lifetime (`auth.jwt.accessToken.expirationTimeInSeconds`), no lease: `SessionService.isLoginActive` trusts a hit whose `jtiDigest` matches the token, and on a differing hit invalidates the key and reads through once more.
- A refresh is one transaction: a guarded `updateMany` swaps the old `jtiDigest` for the new one, then the login stamp and `DeviceOwnership.lastActiveAt`; a miss is reuse, revoked in the same transaction. The rotation writes no cache: the new token's first request reloads the entry, and the old access token passes only while the entry still holds the old digest. A retry of a lost response with the old token is reuse, an accepted trade-off.
- A device holds one signed-in user. A login, inside its transaction, revokes every live session of every other user whose `DeviceOwnership` points at the same `Device`, its `where` carrying `isRevoked: false` and ignoring `expiredAt` as every revoke's does; the revoke adds one purge row per affected user with the exact `ISessionRef[]` revoked for that user. Their `DeviceOwnership` rows stay unrevoked: the device stays in their list, with no live session and, once the purge job runs, no push token. Each affected user gets one activity row under a dedicated action; the logging-in user's login row is unchanged. No notification goes to an affected user.
