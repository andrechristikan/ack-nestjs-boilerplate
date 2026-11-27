---
title: Sensitive Data Reference
description: Every sensitive datum the application stores or processes, its protection level, and what each level gets at rest, in payloads, in logs, in responses, in retention, and in integrity checks.
---

# Sensitive Data Reference

This page lists the sensitive data of the application and the protection each level gets, for a developer or auditor who looks up how a datum is stored, logged, returned, and kept.

## Table of Contents

- [Related Documents](#related-documents)
- [Levels](#levels)
    - [Credential](#credential)
    - [Personal](#personal)
    - [Internal](#internal)
- [Encoded-only data](#encoded-only-data)
- [Transit](#transit)

## Related Documents

- [Security][ref-doc-concept-security-cryptography]: the algorithms, the two encryption roots, and the purpose and context of a sealed value
- [Logging Reference][ref-doc-reference-logging-redacted-keys]: the redacted keys and their limits
- [Sentry][ref-doc-concept-sentry-scrubbing]: how events are scrubbed
- [Configuration Reference][ref-doc-reference-configuration]: every retention and TTL key named below
- [Queue][ref-doc-concept-queue-outbox]: the outbox row that holds a job payload
- [Notification][ref-doc-concept-notification-payload-encryption]: how a notification payload is sealed
- [Session][ref-doc-concept-session-lifecycle]: revocation and the retention purge
- [MFA][ref-doc-concept-mfa]: TOTP secrets, backup codes, and challenges
- [User][ref-doc-concept-user-deletion]: what self-deletion clears
- [Activity Log][ref-doc-concept-activity-log]: the request log of an entry and its masking
- [Database Reference][ref-doc-reference-database]: the models
- [Field Access Reference][ref-doc-reference-field-access]: which audience reads which field of each resource
- [Production][ref-doc-production-keys]: where the secrets live and TLS between hosts

## Levels

A datum sits in the level of its most sensitive use. Each level has the same entry: its data, and its protection at rest, in job and outbox payloads, in logs, in responses, in retention, and in integrity checks.

| Level | Holds |
| --- | --- |
| Credential | a value that proves an identity or opens an account, a session, or an encrypted value |
| Personal | a value that identifies or locates a person |
| Internal | every other field |

A sealed value is AES-256-GCM under `APP_ENCRYPTION_SECRET` unless the entry names another root, with a purpose constant and a context id ([Cryptography used][ref-doc-concept-security-cryptography]). A digest is SHA-256 (`HelperHashService.sha256Hash`) and a password hash is argon2id (`argon2Hash`). `Outbox.data` is readable in the database, so a credential and a contact value a payload carries travel sealed; the request log, the `username`, the ids, and internal data travel plain.

### Credential

Data:

| Datum | Field or payload | At rest |
| --- | --- | --- |
| Password | `User.password`, `PasswordHistory.password` | argon2id hash |
| Generated password (admin create, import, admin reset) | the same two fields, and `encryptedPassword` in the notification context | argon2id hash; sealed in the payload |
| TOTP secret | `MfaTotp.secret` | sealed under `MFA_TOTP_ENCRYPTION_SECRET`, purpose `mfa.totp.secret`, context the user id |
| TOTP pending secret | `MfaTotp.pendingSecret` | sealed the same way |
| Backup code | `Mfa.backupCodes` | argon2id hash of each code |
| Access and refresh token | none | not stored |
| Session `jti` | `Session.jtiDigest`, and `jtiDigest` in the session login cache entry | SHA-256 digest |
| Email verification link token and one-time code | `Verification.token` | SHA-256 digest |
| Password reset token | `ForgotPassword.token` | SHA-256 digest |
| Workspace invite token | `WorkspaceInvite.token` | SHA-256 digest |
| Social sign-in nonce | `AuthSocialNonce.nonceHash` | SHA-256 digest |
| MFA challenge token | `MfaChallenge.tokenHash` | SHA-256 digest |
| API key secret | `ApiKey.hash`, the digest of `<key>:<secret>`, also in the API key cache entry | SHA-256 digest; `ApiKey.key` is stored plain |
| Encryption roots and JWT private keys | `APP_ENCRYPTION_SECRET`, `MFA_TOTP_ENCRYPTION_SECRET`, `AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY`, `AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY` | environment variables and Vault; no row holds them |
| Presign signature | `presignUrl` of a presign response | not stored |

A passkey public key and a WebAuthn challenge are stored plain and sit in the Internal level.

- At rest:
    - A value the application only compares is a digest, and a value it reads back is sealed.
    - A cache entry holds the digest too: the session login entry keeps `jtiDigest` for `session.loginCacheTtlInMs` ([session][ref-doc-reference-configuration-session]), and the API key entry keeps `hash` for `auth.xApiKey.cacheTtlInMs` ([auth][ref-doc-reference-configuration-auth]).
    - The roots and the private keys come from the environment or from Vault ([Keys and secrets][ref-doc-production-keys]).
- In job and outbox payloads:
    - A secret of a notification kind (a password, a link, a one-time code) travels as `encrypted<Field>`, sealed under purpose `notification.payload` with the recipient's user id as context.
    - The raw token inside a verification, reset, or invite link travels only inside the sealed link.
    - The sealed secret stays in `Notification.metadata` and is opened only to send.
    - A password the user sets is in no payload. Only a generated password travels sealed, in the `welcomeByAdmin` and `temporaryPasswordByAdmin` kinds, whose contract lists `password` in `secrets`.
    - A raw nonce or backup code is in no payload, and the raw refresh token lives in the request context of the refresh route only.
- In logs:
    - A credential is never written to a log line or an error message, and a Sentry event is scrubbed with the same key list.
    - The redacted keys cover the password, token, secret, nonce, one-time code, backup code, challenge token, invite token, access and refresh token, private key, and API key names ([Redacted keys][ref-doc-reference-logging-redacted-keys]).
    - The names of a digest field (`jtiDigest`, `tokenHash`, `nonceHash`, `hash`) are not on the list.
- In responses:
    - A credential is returned only in the response that issues it, and no response returns a stored digest or hash.
    - `accessToken` and `refreshToken` (`AuthTokenResponseSchema`) are returned once, at sign-in and refresh.
    - `challengeToken` is returned once, at the MFA login, passkey login, and reset-password challenge routes.
    - `nonce` (`AuthSocialNonceResponseSchema`) is returned once, when a social sign-in starts.
    - `secret` and `otpauthUrl` (`MfaTotpSetupResponseSchema`) are returned once, at TOTP setup.
    - `backupCodes` (`MfaBackupCodesResponseSchema`) are returned at regeneration always. TOTP enable and passkey registration (`MfaPasskeyRegisterResponseSchema`) return them only when the user holds no code, and `null` otherwise.
    - `secret` (`ApiKeyCreateResponseSchema`) is returned when an admin creates or resets an API key.
    - `presignUrl` (`AwsS3PresignResponseSchema`) is returned when a client asks for a presign.
    - A notification list censors each secret of the kind before it answers.
- Retention:
    - Each module purges its own rows with a daily `purgeExpired` job on its own queue.
    - The `session` queue (`session.purgeExpiredCron`, [session][ref-doc-reference-configuration-session]) deletes `Session` rows `session.retentionInMs` after `expiredAt`, revoked or not. `expiredAt` is the token's original expiry: a revoke sets `isRevoked` and `revokedAt` and leaves it.
    - The `mfa` queue (`mfa.purgeExpiredCron`) deletes `MfaChallenge` rows `mfa.challengeRetentionInMs` ([mfa][ref-doc-reference-configuration-mfa]) after `expiredAt`.
    - The `userAuth` queue (`user.purgeExpiredCron`, [user][ref-doc-reference-configuration-user]) deletes `Verification` rows `verification.retentionInMs` ([verification][ref-doc-reference-configuration-verification]) after `expiredAt`, and `ForgotPassword` rows `forgotPassword.retentionInMs` ([forgotPassword][ref-doc-reference-configuration-forgot-password]) after `expiredAt`.
    - The `passwordHistory` queue (`passwordHistory.purgeExpiredCron`) deletes a `PasswordHistory` row at its `expiredAt`, the end of its reuse period: `auth.password.periodInDays` after the password was set ([auth][ref-doc-reference-configuration-auth]).
    - `AuthSocialNonce` rows are deleted when the nonce is consumed, and each issue deletes the expired rows. A nonce expires `auth.social.nonce.expiresInMs` after issue ([auth][ref-doc-reference-configuration-auth]).
    - `MfaTotp` is deleted when TOTP is disabled. An admin MFA reset or self-deletion removes every factor and the backup codes.
    - A `WorkspaceInvite` row keeps its token digest after it is accepted, revoked, or expired.
    - An `ApiKey` row stays after an admin deletes it: the delete is a soft delete, and the row keeps `key` and `hash`.
    - The sealed values in `Notification.metadata` have no purge.
    - The `outbox` queue's daily `scrubExpired` job (`outbox.scrubExpiredCron`) empties `Outbox.data` and `lastError` of a `completed` or `failed` row `outbox.retentionInMs` after its last update and sets `scrubbedAt`. The row stays.
- Integrity:
    - A sealed value carries the AES-256-GCM authentication tag and binds its context. A value sealed for another id fails to open with `HelperDecryptFailedException`, and the job that reads it stops without a retry.
    - An undecryptable TOTP secret answers `MfaTotpSecretUnavailableException`.
    - A digest compared in application code goes through `HelperHashService.sha256Compare`, which uses `timingSafeEqual`. A verification, reset, invite, or challenge token is found by an equality query on its digest.
    - A password or backup code is checked with `argon2Compare`.
    - A JWT verifies against the JWKS: ES256 for the access token and ES512 for the refresh token.

### Personal

Data:

| Datum | Field or payload | At rest |
| --- | --- | --- |
| Email address | `User.email`, `WorkspaceInvite.email`, `Verification.to`, `ForgotPassword.to` | plain |
| Mobile number | `UserMobileNumber.number` and `phoneCode`, `Verification.to` | plain |
| Profile | `User.name`, `username`, `gender`, `photo`, `countryId` | plain |
| Join request message | `WorkspaceJoinRequest.message`, free text a user writes to a workspace | plain |
| Social identity | `UserSocial.subject` | plain |
| Last sign-in address | `User.lastIpAddress` | plain |
| Request log of a row | `ipAddress`, `userAgent`, and `geoLocation` of `ActivityLog` and `Session` | plain |
| Device | `Device.fingerprint` and `name` | plain |
| Access token claims | `username` in the access token payload | signed, not encrypted ([Encoded-only data](#encoded-only-data)) |
| Admin user export | the CSV object at `user.export.pathPattern` under `aws.s3.temporaryPath`, holding `name`, `username`, `email`, and the account fields | plain, in the private bucket |
| Push token | `DeviceOwnership.notificationToken` | plain |
| Push token of a pending MFA login | `MfaChallenge.device.encryptedNotificationToken` | sealed under `APP_ENCRYPTION_SECRET`, purpose `mfa.challenge.notificationToken`, context the user id |

- At rest:
    - Every value above but the push token of a pending MFA login is stored plain, because the application searches, sends to, or shows it.
    - The email address is stored in lower case.
    - A push token is read back to send, and `DeviceOwnership.notificationToken` is queried by value.
- In job and outbox payloads:
    - The recipient address, mobile number, and device tokens travel as `encryptedEmail`, `encryptedMobileNumber`, `encryptedTokens`, `encryptedPendingTokens`, and `encryptedFailureTokens`, sealed under purpose `notification.payload` with the recipient's user id as context.
    - An invitee with no account gets the address and link sealed under purpose `notification.payload` with the invite reference as context.
    - An admin import row carries `encryptedEmail`, sealed under purpose `user.import` with the importing admin's id as context.
    - The `username` and ids travel plain.
    - The request log (`ipAddress`, `userAgent`, `geoLocation`) travels plain in every activity-entry payload and in the `activityLog` part of the import, export, self-deletion, and workspace deletion payloads.
- In logs:
    - When `logger.accessLogEnabled` is on ([logger][ref-doc-reference-configuration-logger]), the access log records the client IP and the user agent: `req.ip` (the forwarded address under `trust proxy`, else the socket address) and the `User-Agent` header, as received, with `userId` in the record.
    - Who reads the logs and how long they are kept belong to the log sink ([Observability][ref-doc-production-observability]).
    - Redaction matches a whole key name, case-insensitive. The redacted keys cover `location`, `gps`, `coordinates`, `latitude`, and `longitude`. A field named `email`, `ipAddress`, or `notificationToken` is not redacted, so its value reaches a log line, and the `extra` and `contexts` of a Sentry event, as it is ([Redacted keys][ref-doc-reference-logging-redacted-keys]).
    - `sendDefaultPii` is off in Sentry, so Sentry attaches neither the user nor the client IP itself, and no code sets a Sentry user.
- In responses:
    - An email address and a mobile number are censored in every response body outside the `/admin` scope with `HelperStringService.censorEmail` and `censorMobileNumber`: the profile, the mobile number routes, and the workspace invite list. The admin user routes answer them whole.
    - The access token returned at sign-in and refresh carries no email and the `username` whole, because its payload is signed and not encrypted ([Encoded-only data](#encoded-only-data)).
    - A name, username, and photo are whole wherever `UserRefResponseSchema` embeds them.
    - `lastIpAddress` is in the owner's profile and the admin user detail, and the admin list omits it.
    - `SessionResponseSchema` answers `ipAddress`, `userAgent`, and `geoLocation` whole to the owner and to an admin ([Session][ref-doc-reference-field-access-session]).
    - The request log of an activity entry is whole for the entry's actor and for an admin. The shared activity-log scope answers `null` for another actor's entry ([Activity log entry][ref-doc-reference-field-access-activity-log]).
    - A push token is in no response: `DeviceOwnershipResponseSchema` carries `notificationProvider` and no token, and the device carries no fingerprint.
- Retention:
    - Self-deletion rewrites `email` and `username` to `deleted.<id>`. It clears `name`, `gender`, `photo`, `lastIpAddress`, and the last-login fields. It soft-deletes the mobile numbers, rewriting each `number` to `deleted-{id}`, deletes the social links, and revokes every session and device ownership ([Self-deletion and purge][ref-doc-concept-user-deletion]).
    - The `activityLog` queue's daily `purgeExpired` job (`activityLog.purgeExpiredCron`) deletes `ActivityLog` rows `activityLog.retentionInMs` after `createdAt`, and the request log goes with them ([activityLog][ref-doc-reference-configuration-activity-log]).
    - A push token is cleared (`notificationToken` and `notificationProvider` set to `null`) when its ownership is revoked by a device removal or self-deletion, by a failed send's token cleanup, and by the daily `cleanupStaleTokens` job (`notification.push.cleanupStaleTokensCron`) on an ownership idle longer than `notification.push.staleTokenThresholdInMs` ([notification][ref-doc-reference-configuration-notification]). The `DeviceOwnership` row has no purge.
    - The export CSV is deleted by the bucket lifecycle rule that the `awsS3Config` seed sets through `AwsS3Service.settingBucketExpiredObjectLifecycle`: it deletes every object under `aws.s3.temporaryPath` after `aws.s3.temporaryExpiresInDays`, and the export lives there ([aws][ref-doc-reference-configuration-aws]).
    - `Session` rows follow the retention of the Credential level, and so do the `to` of `Verification` and `ForgotPassword`.
    - `Device`, `Notification`, `NotificationDelivery`, and `WorkspaceInvite` rows have no purge, and an `Outbox` row is never deleted.
- Integrity:
    - A sealed value has the same authentication and context binding as in the Credential level.
    - A plain field has no check beyond the database.

### Internal

Data: every other model and field, such as statuses, roles, workspace and project names, flags, and timestamps. The models are in [Database Reference][ref-doc-reference-database].

- At rest: plain.
- In job and outbox payloads: plain, with the ids a job needs.
- In logs: plain, with the redacted keys applied wherever a key matches.
- In responses: whole, per the response schema of the route ([Field Access Reference][ref-doc-reference-field-access]).
- Retention: a row is kept unless a Credential or Personal entry above names the job that deletes it.
- Integrity: the database constraints and the guarded writes of each flow.

## Encoded-only data

Three tokens leave the application encoded and carry data: the access token, the refresh token, and the cursor token.

- The access token payload holds `userId`, `roleId`, `username`, `sessionId`, `deviceOwnershipId`, `loginAt`, `loginFrom`, and `loginWith`, with the claims `jti`, `iat`, `exp`, `aud`, `iss`, and `sub` (the user id). The payload is signed and not encrypted, so the holder reads it.
- The refresh token payload holds `userId`, `sessionId`, `deviceOwnershipId`, `loginAt`, `loginFrom`, and `loginWith`, with the same claims. It has no username or role.
- A cursor token holds the sort-field values of the last row (`values`) and a `fingerprint`, the first 16 characters of the SHA-256 of the scope, the filters, and the sort. It is sealed with AES-256-GCM under `APP_ENCRYPTION_SECRET`, purpose `PaginationCursor`, and the fixed context `PaginationCursorEncryptionContext`, because a cursor has no owner. A cursor whose fingerprint differs from the request answers `PaginationInvalidCursorPaginationParamsException` (422) ([Pagination][ref-doc-concept-pagination]).

## Transit

TLS between hosts is a deployment setting: [TLS between hosts][ref-doc-production-tls].

<!-- REFERENCES -->

[ref-doc-concept-security-cryptography]: ../concepts/security.md#cryptography-used
[ref-doc-reference-logging-redacted-keys]: logging.md#redacted-keys
[ref-doc-concept-sentry-scrubbing]: ../concepts/sentry.md#scrubbing
[ref-doc-reference-configuration]: configuration.md
[ref-doc-reference-configuration-session]: configuration.md#session
[ref-doc-reference-configuration-activity-log]: configuration.md#activitylog
[ref-doc-reference-configuration-auth]: configuration.md#auth
[ref-doc-reference-configuration-user]: configuration.md#user
[ref-doc-reference-configuration-mfa]: configuration.md#mfa
[ref-doc-reference-configuration-verification]: configuration.md#verification
[ref-doc-reference-configuration-forgot-password]: configuration.md#forgotpassword
[ref-doc-reference-configuration-notification]: configuration.md#notification
[ref-doc-reference-configuration-aws]: configuration.md#aws
[ref-doc-reference-configuration-logger]: configuration.md#logger
[ref-doc-concept-queue-outbox]: ../concepts/queue.md#outbox-row-in-the-transaction
[ref-doc-concept-notification-payload-encryption]: ../concepts/notification.md#payload-encryption
[ref-doc-concept-session-lifecycle]: ../concepts/session.md#lifecycle-and-revocation
[ref-doc-concept-mfa]: ../concepts/mfa.md
[ref-doc-concept-user-deletion]: ../concepts/user.md#self-deletion-and-purge
[ref-doc-concept-activity-log]: ../concepts/activity-log.md#reading-entries
[ref-doc-concept-pagination]: ../concepts/pagination.md
[ref-doc-reference-database]: database.md
[ref-doc-reference-field-access]: field-access.md
[ref-doc-reference-field-access-activity-log]: field-access.md#activity-log-entry
[ref-doc-production-tls]: ../production.md#tls-between-hosts
[ref-doc-production-observability]: ../production.md#observability
[ref-doc-reference-field-access-session]: field-access.md#session
[ref-doc-production-keys]: ../production.md#keys-and-secrets
