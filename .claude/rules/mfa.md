---
paths:
    - 'src/modules/mfa/**'
    - 'src/modules/user/services/**'
    - 'src/modules/user/use-cases/**'
    - 'src/configs/mfa.config.ts'
    - 'src/app/dtos/app.env.dto.ts'
    - '.env.example'
    - 'prisma/schema.prisma'
    - 'src/modules/feature-flag/enums/feature-flag.enum.ts'
    - 'src/modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto.ts'
    - 'src/migration/data/migration.feature-flag.data.ts'
    - 'src/modules/notification/contracts/notification.kind.contract.ts'
    - 'src/modules/activity-log/contracts/activity-log.action.contract.ts'
---

# MFA

Sessions: `session.md`. Credentials, cryptography, and the request store: `security.md`. Sign-in and accounts: `login.md`.

`MfaTotp.secret` holds only a confirmed authenticator, encrypted with the TOTP root (`mfa.totp.encryptionSecret`) and the user id. Setup writes `pendingSecret` and is refused while a confirmed secret exists; confirming moves it into `secret`; disable deletes the row. An undecryptable secret raises `MfaTotpSecretUnavailableException` (409); a user with no confirmed secret is a method not enrolled (below).

- The factors are TOTP, one per user, and passkey: WebAuthn through `@simplewebauthn/server`, user verification required, up to the `mfa` flag's `passkeyMaxPerUser` per user. MFA is on with a confirmed TOTP or any passkey the `mfa` flag allows (`feature-flag.md`, Gating); a user enrols several factors and picks one per challenge. A biometric (Face ID, a fingerprint) is the passkey: no device key pair of our own, no WebAuthn on `node:crypto`. SMS is no factor. `MFA_PASSKEY_RP_ID` and `MFA_PASSKEY_ORIGINS` are required environment keys.
- Each `MFA_PASSKEY_ORIGINS` entry is an exact origin (`https://host`, `http://host[:port]`, no path, no trailing slash), `https://*.<domain>` with `<domain>` the RP ID or under it, or `android:apk-key-hash:<hash>`; `AppEnvSchema` refuses any other shape at boot, and a `*` entry in production; elsewhere `*` admits any origin. `MfaPasskeyService` reads the origin from the response's `clientDataJSON`, matches it against the entries, and passes that response origin to the library as `expectedOrigin`.
- Every user has one `Mfa` row, created with the user: the attempt counter, the lock, and the backup codes. Enrolling a factor writes fresh codes when none remain and keeps held ones; removing the last factor empties them; they recover either factor. `MfaService.completeInTx` consumes a code by its matched hash, against the row read in its transaction.
- An attempt counts failures only: the flow asserts no lock (`UserPasswordService.assertPasswordAttemptAvailable`; `MfaService.checkProof` on `state.mfa`; `assertAttemptAvailable` in `checkTotpSetupCode`), checks the credential without writing, and on a mismatch the use case counts in a transaction of its own (`UserPasswordService.countFailedPasswordAttemptInTx`, `MfaService.countFailedAttemptInTx`), then throws. A match resets counter and lock inside the flow's transaction (`resetPasswordAttemptInTx`, `MfaService.completeInTx`).
- A flow reads the user's factor rows once, before its transaction, through `MfaService.getFactorState`, and passes the `IMfaFactorState` to each pre-transaction check (`isEnabled`, `assertEnabled`, `getLoginMethods`, `check`, `checkReauthentication`), which reads no row the state holds; `checkPasskeyLogin` builds one from its passkey and one `Mfa` read.
- One budget covers every MFA method: only `MfaService` counts, and `MfaTotpService` and `MfaPasskeyService` answer `null` on a mismatch. A missing method, a method the user has not enrolled, a method the flag switches off, and `backupCode` with no code left throw uncounted.
- Every MFA mismatch, in a login, a password reset, or a re-authentication, adds the `userMfaVerificationFailed` entry in `MfaService.countFailedAttemptInTx`, on the use case's own transaction (ASVS 16.3.1).
- The failure reaching `passwordMaxAttempts` or `mfaMaxAttempts` (flag metadata, `feature-flag.md`) zeroes the counter, sets `passwordLockedUntil` or `Mfa.lockedUntil` its `…LockDurationInMinutes` ahead, and adds the `userReachMax…Attempt` entry and the mandatory `loginLocked` notification. A lock throws the max-attempt exception, touches no status, session, or device, and opens with the clock. A reactivation clears both locks, a password write the password lock, an admin MFA reset the MFA lock.
- MFA is opt-in per user. TOTP runs SHA-1 with `window` 1 (`mfa.totp.algorithm`, `mfa.totp.window`).
- `MfaTotp.lastUsedStep` accepts each TOTP step once. A passkey assertion whose counter did not increase is a mismatch, except a counter of 0 stored and asserted.
- A challenge is an `MfaChallenge` row of one `EnumMfaChallengePurpose`, read and claimed for that purpose only; the login's is created in the login's transaction. The flow claims it with a guarded `updateMany` inside the transaction that completes the check, in `UserLoginVerifyMfaUseCase` the one that creates the session.
- `UserLoginVerifyMfaUseCase` awaits `MfaService.getFactorState` beside `UserAuthService.getOneForMfaLogin`, which reads the user alone, in one `Promise.all`, then `MfaService.assertEnabled`.
- A re-authentication's MFA part is `MfaService`'s (`credential-policy.md`, Re-authentication): `checkReauthentication` writes nothing and answers whether MFA is on, the check, or the failure, a passkey proof against a `reauthentication` challenge standing for the whole proof; `completeReauthenticationInTx` claims that challenge and completes the check through `completeInTx`.
- An admin reset deletes every factor and empties the codes, the counter, and the lock: the next login asks no MFA.
