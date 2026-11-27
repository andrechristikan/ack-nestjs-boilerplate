---
title: Social Sign-In Guide
description: Configure Google and Apple client ids for local development, request a nonce, and sign in with a provider ID token.
---

# Social Sign-In Guide

This guide shows how to turn Google and Apple sign-in on locally and call the login routes, for a developer who builds a client that signs users in with a provider account.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Authentication][ref-doc-concept-authentication]: the guard, the nonce, and how a social login resolves its user
- [Dependencies][ref-doc-concept-dependencies]: the 501 an unset provider answers and the 503 an unreachable one answers
- [Configuration Reference][ref-doc-reference-configuration-triggers]: the variables that turn each provider on
- [Seeded rows][ref-doc-reference-database-featureflag]: the `loginWithGoogle` and `loginWithApple` flags
- [Route Protection Guide][ref-doc-guide-route-protection]: where the social guard sits in a route's stack
- [Installation][ref-doc-installation]: the local `.env` file

## Prerequisites

- A running local API with a seeded database. The seed enables the `loginWithGoogle` and `loginWithApple` flags, each with `signUpAllowed` set to `true` ([Installation][ref-doc-installation]).
- A Google Cloud project for Google, and an Apple Developer account for Apple.
- A client that can request an ID token from the provider and pass a nonce to the provider's sign-in request.
- The default API key of the local seed, sent as `<key>:<secret>` ([Seeded rows][ref-doc-reference-database-apikey]).

## Steps

1. For Google, create an OAuth 2.0 web client ID in the [Google Cloud Console][ref-google-console] and put it in `AUTH_SOCIAL_GOOGLE_CLIENT_ID`. The API verifies each ID token with the audience set to this id. An Android client passes the web client id as `setServerClientId` ([Credential Manager][ref-google-android]) and an iOS client as `serverClientID` ([Google Sign-In SDK][ref-google-ios]), so the token's `aud` is the web client id. A token minted with another client id as its audience answers `AuthSocialGoogleInvalidException` (401, `50803`). A web client on Google Identity Services registers `http://localhost` and `http://localhost:<port>` as authorized JavaScript origins for local development ([Get your Google API client ID][ref-google-web]).
2. For Apple, list every identifier your clients sign in with in `AUTH_SOCIAL_APPLE_CLIENT_IDS`. A native iOS app's token carries the app's bundle id as `aud`, and the app needs the Sign in with Apple capability and no domain or return URL ([Configuring your environment][ref-apple-native]). A web client uses a Services ID, listed beside the bundle id, and registers a domain and an absolute HTTPS return URL ([Configure Sign in with Apple for the web][ref-apple-web]). For local web testing, register the domain of an HTTPS tunnel to the local client, because Apple takes no `localhost` or plain-`http` return URL. The API accepts a token minted for any identifier you list.
3. Set the ids in `.env`. Leave a variable empty to keep that provider off:

    ```env
    AUTH_SOCIAL_GOOGLE_CLIENT_ID=<googleClientId>
    AUTH_SOCIAL_APPLE_CLIENT_IDS=<commaSeparatedAppleClientIds>
    ```

4. Restart the API, because configuration is read at boot.
5. Ask for a nonce. The route is public and needs the default key ([Seeded rows][ref-doc-reference-database-apikey]). The answer holds the plain `nonce` and its `expiredAt`, five minutes ahead:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/public/auth/social/nonce/create \
      -H 'x-api-key: <key>:<secret>'
    ```

6. Pass the plain `nonce` to the provider's sign-in request, so the ID token carries it in its `nonce` claim. The API hashes the token's `nonce` claim and matches it against its stored hash, so a client that hashes the nonce first (as Firebase's Apple samples do) answers `AuthSocialNonceInvalidException`. Each login spends one nonce, so ask for a fresh one per attempt.
7. Send the ID token as the bearer of the login route, with the device and the client kind in the body. Every call sends `username`, `countryId`, `cookies`, and `marketing`, plus optionally `name` and `inviteToken`; a sign-in to an existing account ignores them. `from` is `website` or `mobile`, and `device.platform` is `ios`, `android`, or `web`. Use `POST /api/v1/public/user/login/social/apple` for Apple:

    ```bash
    curl -s -X POST http://localhost:3000/api/v1/public/user/login/social/google \
      -H 'x-api-key: <key>:<secret>' \
      -H 'authorization: Bearer <idToken>' \
      -H 'content-type: application/json' \
      -d '{ "from": "website", "device": { "fingerprint": "<32 to 128 characters>", "platform": "web" }, "username": "jane-doe", "countryId": "<countryId>", "cookies": false, "marketing": false }'
    ```

    `countryId` is an `id` from `GET /api/v1/public/country/list`; the seed writes Indonesia ([Seeded rows][ref-doc-reference-database-country]).

8. To refuse new accounts and allow sign-in only for existing ones, act as an admin: read the flag id from `GET /api/v1/admin/feature-flag/list`, then send `PUT /api/v1/admin/feature-flag/update/<featureFlagId>/metadata` with every metadata key the flag holds and `signUpAllowed: false` (the key set is fixed). The change applies once the cache invalidation job runs. A sign-in with no matching account then answers `UserNotFoundException` (404, `51000`).

## Check the result

1. The answer of a first sign-in carries `isMfaRequired: false` and `tokens`. A user with an MFA factor gets `isMfaRequired: true` and a challenge instead ([MFA][ref-doc-concept-mfa-challenge]).
2. Send the same ID token again. It answers `AuthSocialNonceInvalidException` (401, `50812`), because the first request spent the nonce.
3. Leave the provider's variable empty, restart, and call its route. It answers 501: `AuthSocialGoogleNotConfiguredException` (`50806`) or `AuthSocialAppleNotConfiguredException` (`50807`).
4. Send a token minted for another client id. It answers `AuthSocialGoogleInvalidException` (`50803`) or `AuthSocialAppleInvalidException` (`50805`), both 401.
5. As an admin, send `PATCH /api/v1/admin/feature-flag/update/<featureFlagId>/status` with `isEnable: false`; it applies once the cache invalidation job runs. The route then answers `FeatureFlagDisabledException` (404, `50601`) before it reads the token.

## Related tasks

- [Passkeys Guide][ref-doc-guide-passkeys]: sign a user in with a passkey.
- [Route Protection Guide][ref-doc-guide-route-protection]: stack the guards on a route.

<!-- REFERENCES -->

[ref-google-console]: https://console.cloud.google.com/
[ref-google-android]: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
[ref-google-ios]: https://developers.google.com/identity/sign-in/ios/reference/Classes/GIDConfiguration
[ref-google-web]: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
[ref-apple-native]: https://developer.apple.com/tutorials/data/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple.md
[ref-apple-web]: https://developer.apple.com/help/account/configure-app-capabilities/configure-sign-in-with-apple-for-the-web
[ref-doc-concept-authentication]: ../concepts/authentication.md#social-sign-in-and-its-nonce
[ref-doc-concept-dependencies]: ../concepts/dependencies.md#optional-adapters
[ref-doc-concept-mfa-challenge]: ../concepts/mfa.md#challenge-at-login
[ref-doc-reference-configuration-triggers]: ../reference/configuration.md#integration-triggers
[ref-doc-reference-database-apikey]: ../reference/database.md#apikey
[ref-doc-reference-database-country]: ../reference/database.md#country
[ref-doc-reference-database-featureflag]: ../reference/database.md#featureflag
[ref-doc-guide-route-protection]: route-protection.md
[ref-doc-guide-passkeys]: passkeys.md
[ref-doc-installation]: ../getting-started/installation.md
