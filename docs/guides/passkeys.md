---
title: Passkeys Guide
description: Set the relying party and the allowed origins locally, register a passkey for a signed-in user, and sign in with it.
---

# Passkeys Guide

This guide shows how to register a passkey and sign in with it against a local API, for a developer who builds a browser client.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [MFA][ref-doc-concept-mfa]: the factors, the challenge, the counter check, and the attempt budget
- [Authentication][ref-doc-concept-authentication]: how a passkey login creates a session
- [Configuration Reference][ref-doc-reference-configuration-triggers]: the entry shapes of `MFA_PASSKEY_ORIGINS`
- [Production][ref-doc-production-variables]: the passkey client files a mobile app needs and the production values
- [Seeded rows][ref-doc-reference-database-featureflag]: the `mfa` and `loginWithPasskey` flags
- [Social Sign-In Guide][ref-doc-guide-social-sign-in]: the other passwordless sign-in
- [Status Codes][ref-doc-reference-status-codes-mfa]: the code and message of each MFA exception

## Prerequisites

- A running local API with a seeded database. The seed enables the `mfa` flag with `passkeyAllowed` set to `true` and `passkeyMaxPerUser` set to `10`, and the `loginWithPasskey` flag.
- A browser client served from a secure context. `localhost` counts as one.
- A signed-in user with an access token, and the default API key, sent as `<key>:<secret>` ([Seeded rows][ref-doc-reference-database-apikey]). Get the token by signing in as `user@mail.com` with `POST /api/v1/public/user/login/credential` ([Seeded rows][ref-doc-reference-database-user]).
- The client's origin: its scheme, host, and port, with no path and no trailing slash.

## Steps

1. Put the client's origin from Prerequisites in `MFA_PASSKEY_ORIGINS`, a comma-separated list. The browser reports the page's origin, and the `.env.example` value `http://localhost:3000` matches only a client served on that port. `MFA_PASSKEY_RP_ID` is a bare domain with no scheme or port, and the host of every client origin equals it or sits under it. The local `REQUEST_CORS_ALLOWED_ORIGINS=*` lets a client on another port call the API. `.env.example` holds the local values:

    ```env
    MFA_PASSKEY_RP_ID=localhost
    MFA_PASSKEY_ORIGINS=http://localhost:3000
    ```

    A `*` entry admits any origin outside production, which suits a quick test. The other entry shapes are in the [Configuration Reference][ref-doc-reference-configuration-triggers].

2. Restart the API, because configuration is read at boot.
3. Ask for the registration options as the signed-in user. The answer holds a `challengeToken`, its `expiresInMs`, and the WebAuthn `passkeyOptions`:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/shared/mfa/passkey/registration/generate \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>'
    ```

4. In the browser, parse `passkeyOptions` with `PublicKeyCredential.parseCreationOptionsFromJSON`, pass the result as `publicKey` to `navigator.credentials.create`, and send `credential.toJSON()` as `registrationResponse`. The API requires user verification and a resident key, so the authenticator prompts for a biometric or a PIN.
5. Send the credential back with the challenge token and a name. This call needs a re-authentication. Send the current password; with MFA on, also `method` (`totp` or `backupCode`) with `code` or `backupCode`. Or send a passkey proof alone: `passkeyChallengeToken` and `passkeyResponse` from `/shared/mfa/passkey/reauthentication/generate`. An account with neither a password nor MFA sends `otp` from `POST /api/v1/shared/user/reauthentication/send` ([Reauthentication][ref-doc-concept-mfa-reauthentication]):

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/shared/mfa/passkey/register \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>' \
      -H 'content-type: application/json' \
      -d '{ "challengeToken": "<challengeToken>", "name": "laptop", "registrationResponse": <credentialJson>, "password": "<currentPassword>" }'
    ```

    The answer holds the passkey and, when it is the user's first factor, the backup codes. The codes are shown once, so store them.

6. Sign in with the passkey. Ask for the options with no credentials. The route is public and needs the default key, and it answers a `challengeToken`, its `expiresInMs`, and `passkeyOptions`:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/public/user/login/passkey/generate \
      -H 'x-api-key: <key>:<secret>'
    ```

7. In the browser, parse `passkeyOptions` with `PublicKeyCredential.parseRequestOptionsFromJSON`, pass the result as `publicKey` to `navigator.credentials.get`, and send `assertion.toJSON()` as `passkeyResponse` with the challenge token, the client kind, and the device. `from` is `website` or `mobile`, and `device.platform` is `ios`, `android`, or `web`:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/public/user/login/passkey \
      -H 'x-api-key: <key>:<secret>' \
      -H 'content-type: application/json' \
      -d '{ "challengeToken": "<challengeToken>", "passkeyResponse": <assertionJson>, "from": "website", "device": { "fingerprint": "<32 to 128 characters>", "platform": "web" } }'
    ```

A mobile client also needs `/.well-known/apple-app-site-association` for iOS and `/.well-known/assetlinks.json` for Android, served from the RP id domain, and an `android:apk-key-hash:<hash>` origin for Android: [Production][ref-doc-production-variables].

## Check the result

1. The sign-in answers `isMfaRequired: false` with `tokens`. A passkey is the whole proof, so no MFA challenge follows.
2. Read the MFA status as the signed-in user. It lists the passkey with its name, device type, `backedUp`, and `lastUsedAt`:

    ```bash
    curl -s http://localhost:3000/api/v1/shared/mfa/status/get \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <accessToken>'
    ```

3. Send the registration from an origin the list does not hold, with an exact origin list, not `*`. It answers `MfaPasskeyInvalidException` (401, `52610`).
4. Start a second registration on the same authenticator. The browser refuses it (`InvalidStateError`) before any request.
5. As an admin, read the flag id from `GET /api/v1/admin/feature-flag/list` and send `isEnable: false` to `PATCH /api/v1/admin/feature-flag/update/<featureFlagId>/status` for `loginWithPasskey`. The change applies once the cache invalidation job runs. The two sign-in routes answer `FeatureFlagDisabledException` (404, `50601`), and registration keeps working because it reads the `mfa` flag only.
6. A wrong assertion for a registered credential counts on its owner's MFA budget. `mfaMaxAttempts` and `mfaLockDurationInMinutes` are metadata of the `mfa` flag ([Seeded rows][ref-doc-reference-database-featureflag]). After `mfaMaxAttempts` failures, every MFA check answers `MfaAttemptMaxException` (403, `52603`) until the lock ends. An unknown credential id answers `MfaPasskeyInvalidException` (401, `52610`) and counts nothing.

## Related tasks

- [Social Sign-In Guide][ref-doc-guide-social-sign-in]: configure Google and Apple.
- [Route Protection Guide][ref-doc-guide-route-protection]: stack the guards on a route.

<!-- REFERENCES -->

[ref-doc-concept-mfa]: ../concepts/mfa.md
[ref-doc-concept-mfa-reauthentication]: ../concepts/mfa.md#reauthentication
[ref-doc-concept-authentication]: ../concepts/authentication.md#login-methods
[ref-doc-reference-configuration-triggers]: ../reference/configuration.md#integration-triggers
[ref-doc-reference-database-apikey]: ../reference/database.md#apikey
[ref-doc-reference-database-user]: ../reference/database.md#user
[ref-doc-reference-database-featureflag]: ../reference/database.md#featureflag
[ref-doc-reference-status-codes-mfa]: ../reference/status-codes.md#mfa
[ref-doc-production-variables]: ../production.md#variables-set-by-hand
[ref-doc-guide-social-sign-in]: social-sign-in.md
[ref-doc-guide-route-protection]: route-protection.md
