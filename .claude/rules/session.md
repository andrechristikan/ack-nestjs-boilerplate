---
paths:
    - 'src/modules/auth/**'
    - 'src/modules/session/**'
    - 'src/modules/device/**'
    - 'src/modules/user/**'
    - 'src/modules/mfa/**'
---

# MFA and sessions

Credentials, cryptography, and the request store: `security.md`. Sign-in and accounts: `login.md`. Roles and policies: `role.md`.

## MFA

`MfaTotp.secret` holds only a confirmed authenticator, encrypted with the TOTP root (`mfa.totp.encryptionSecret`) and the user id. Setup writes `pendingSecret` and is refused while a confirmed secret exists; confirming moves it into `secret`; disable deletes the row. A missing or undecryptable secret raises `MfaTotpSecretUnavailableException` (409).

- The factors are TOTP, one per user, and passkey: WebAuthn through `@simplewebauthn/server`, user verification required, up to the `mfa` flag's `passkeyMaxPerUser` per user. MFA is on with a confirmed TOTP or any passkey the `mfa` flag allows (`feature-flag.md`, Gating); a user enrols several factors and picks one per challenge. A biometric (Face ID, a fingerprint) is the passkey: no device key pair of our own, no WebAuthn on `node:crypto`. SMS is no factor. `MFA_PASSKEY_RP_ID` and `MFA_PASSKEY_ORIGINS` are required environment keys.
- Each `MFA_PASSKEY_ORIGINS` entry is an exact origin (`https://host`, `http://host[:port]`, no path, no trailing slash), `https://*.<domain>` with `<domain>` the RP ID or under it, or `android:apk-key-hash:<hash>`; `AppEnvSchema` refuses any other shape at boot, and a `*` entry in production, as `REQUEST_CORS_ALLOWED_ORIGINS` (`config.md`); elsewhere `*` admits any origin. `MfaPasskeyService` reads the origin from the response's `clientDataJSON`, matches it against the entries, and passes that response origin to the library as `expectedOrigin`.
- Every user has one `Mfa` row, created with the user: the attempt counter, the lock, and the backup codes. The codes are written with the first factor, kept when another is added, and emptied with the last; they recover either factor.
- An attempt counts failures only: the flow asserts no lock (`UserPasswordService.assertPasswordAttemptAvailable`, `MfaService.assertAttemptAvailable`), checks the credential without writing, and on a mismatch counts in its own transaction (`countFailedPasswordAttempt`, `MfaService.countFailedAttempt`), then throws. A match resets counter and lock inside the flow's transaction (`resetPasswordAttemptInTx`, `MfaService.completeInTx`).
- One budget covers every MFA method: only `MfaService` counts, and `MfaTotpService` and `MfaPasskeyService` answer `null` on a mismatch. A missing method, a method the user has not enrolled, a method the flag switches off, and `backupCode` with no code left throw uncounted.
- Every MFA mismatch, in a login, a password reset, or a re-authentication, adds the `userVerifyMfaFailed` entry in `MfaService.countFailedAttempt`'s transaction (ASVS 16.3.1).
- The failure reaching `passwordMaxAttempts` or `mfaMaxAttempts` (flag metadata, `feature-flag.md`) zeroes the counter, sets `passwordLockedUntil` or `Mfa.lockedUntil` its `…LockDurationInMinutes` ahead, and adds the `userReachMax…Attempt` entry and the mandatory `loginLocked` notification. A lock throws the max-attempt exception, touches no status, session, or device, and opens with the clock. A reactivation clears both locks, a password write the password lock, an admin MFA reset the MFA lock.
- MFA is opt-in per user, an accepted difference from ASVS 6.3.3. TOTP runs SHA-1, which ASVS lists as legacy, with `window` 1 (`mfa.totp.algorithm`, `mfa.totp.window`).
- `MfaTotp.lastUsedStep` accepts each TOTP step once. A passkey assertion whose counter did not increase is a mismatch, except a counter of 0 stored and asserted.
- A challenge is an `MfaChallenge` row of one `EnumMfaChallengePurpose`, read and claimed for that purpose only; the login's is created in the login's transaction. The flow claims it with a guarded `updateMany` inside the transaction that completes the check, in `UserLoginVerifyMfaUseCase` the one that creates the session.
- An admin reset deletes every factor and empties the codes, the counter, and the lock: the next login asks no MFA.

## Session invalidation

Password change (every session but the caller's) or reset, logout, device removal, self-deletion, a TOTP disable or passkey delete (every session but the caller's), an admin MFA reset, a status change to `blocked` or `inactive`, refresh-token reuse, an admin revoke of one or all sessions, and a login on a device another user is signed in to each revoke the session rows; the revoking `SessionService` `*InTx` method adds the session cache purge row to the revoke's transaction (`effects.md`). A revocation reaches the guard's session cache when the purge job runs (`cache.md`). The purge job carries the user id and the exact `ISessionRef[]` revoked, whose login keys `SessionService.deleteLogins` invalidates, never a key pattern. The revoke's activity entries share its transaction. Create and the rotation stamp `Session.lastActiveAt`; a session idle beyond `session.idleTimeoutInMs` is dead, so every live-session read and the rotation carry `lastActiveAt` beside `expiredAt`. Every revoke and rotation `where` carries `isRevoked: false`; a revoke's `where` ignores both bounds, except the refresh's reuse revoke (`SessionService.revokeReusedInTx`), which carries them, so an idle refresh revokes nothing. A password write (change, reset, admin reset) marks the user's unused `ForgotPassword` rows used, inside its transaction.

- The session login entry is a read-through cache in front of the `Session` row, `session.loginCacheTtlInMs`, kept shorter than the access token's lifetime (`auth.jwt.accessToken.expiresInSeconds`), no lease: `SessionService.isLoginActive` trusts a hit whose `jtiDigest` matches the token, and on a differing hit invalidates the key and reads through once more.
- A refresh is one transaction: a guarded `updateMany` swaps the old `jtiDigest` for the new one, then the login stamp and `DeviceOwnership.lastActiveAt`; a miss is reuse, revoked in the same transaction. The rotation writes no cache: the new token's first request reloads the entry, and the old access token passes only while the entry still holds the old digest. A retry of a lost response with the old token is reuse, an accepted trade-off.
- A device holds one signed-in user. A login, inside its transaction, revokes every live session of every other user whose `DeviceOwnership` points at the same `Device`, its `where` carrying `isRevoked: false` and ignoring `expiredAt` as every revoke's does; the revoke adds one purge row per affected user with the exact `ISessionRef[]` revoked for that user. Their `DeviceOwnership` rows stay unrevoked: the device stays in their list, with no live session and, once the purge job runs, no push token. Each affected user gets one activity row under a dedicated action; the logging-in user's login row is unchanged. No notification goes to an affected user.
