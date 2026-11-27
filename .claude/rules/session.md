---
paths:
    - 'src/modules/auth/services/**'
    - 'src/modules/auth/use-cases/**'
    - 'src/modules/auth/guards/**'
    - 'src/modules/session/**'
    - 'src/modules/device/services/**'
    - 'src/modules/device/use-cases/**'
    - 'src/modules/user/services/**'
    - 'src/modules/user/use-cases/**'
    - 'src/modules/mfa/services/**'
    - 'src/modules/mfa/use-cases/**'
    - 'src/configs/session.config.ts'
    - 'prisma/schema.prisma'
    - 'src/modules/activity-log/contracts/activity-log.action.contract.ts'
---

# Sessions

MFA: `mfa.md`. Credentials, cryptography, and the request store: `security.md`. Sign-in and accounts: `login.md`. Roles and policies: `role.md`.

## Session invalidation

Password change (every session but the caller's) or reset, logout, device removal, self-deletion (in the deletion job's transaction), a TOTP disable or passkey delete (every session but the caller's), an admin MFA reset, a status change to `blocked` or `inactive`, refresh-token reuse, an admin revoke of one or all sessions, and a login on a device another user is signed in to each revoke the session rows; the revoking `SessionService` `*InTx` method adds the session cache purge row, `SessionQueue.purgeLoginsEffect` (`ISessionPurgeLoginsEffect`), to the revoke's transaction (`effects.md`), processed by the `purgeLogins` job on the `session` queue. A revocation reaches the guard's session cache when the purge job runs. The purge job carries the user id and the exact `ISessionRef[]` revoked, whose login keys `SessionService.deleteLogins` invalidates, never a key pattern, and purges that cache alone. A revoked session's device keeps its stored push token until `cleanupStaleTokens`; no send reads it, since the token read takes devices with a live session only. The revoke's activity entries share its transaction. Create and the rotation stamp `Session.lastActiveAt`; a session idle beyond `session.idleTimeoutInMs` is dead, so every live-session read and the rotation carry `lastActiveAt` beside `expiredAt`. Every revoke and rotation `where` carries `isRevoked: false`; a revoke's `where` ignores both bounds, except the refresh's reuse revoke (`SessionService.revokeReusedInTx`), which carries them, so an idle refresh revokes nothing. A password write (change, reset, admin reset) marks the user's unused `ForgotPassword` rows used, inside its transaction.

- The session login entry is a read-through cache in front of the `Session` row, `session.loginCacheTtlInMs`, kept shorter than the access token's lifetime (`auth.jwt.accessToken.expiresInSeconds`), no lease: `SessionService.isLoginActive` trusts a hit whose `jtiDigest` matches the token, and on a differing hit invalidates the key and reads through once more.
- A refresh is one transaction: a guarded `updateMany` swaps the old `jtiDigest` for the new one, then the login stamp and `DeviceOwnership.lastActiveAt`; a digest read before the transaction finds reuse; the use case then revokes in a transaction of its own (`SessionService.revokeReusedInTx`) and throws. The rotation writes no cache: the new token's first request reloads the entry, and the old access token passes only while the entry still holds the old digest. A retry of a lost response with the old token is reuse. A refresh token without `jti` or `exp` throws `AuthJwtRefreshTokenInvalidException` before anything is signed; the rotated refresh token expires when the old one would.
- A device holds one signed-in user. A login, inside its transaction, revokes every live session of every other user whose `DeviceOwnership` points at the same `Device`, the ownerships the device upsert answers (`login.md`); the revoke adds one purge row per affected user. Their `DeviceOwnership` rows stay unrevoked: the device stays in their list, with no live session. Each affected user gets one activity row under a dedicated action; the logging-in user's login row is unchanged. No notification goes to an affected user.

## Retention

- A session row is deleted `session.retentionInMs` after its `expiredAt` by the `session` queue's daily `purgeExpired` (`queue.md`, Enqueuing), revoked or not; the retention stays no shorter than `analytic.maxWindowInMs`.
