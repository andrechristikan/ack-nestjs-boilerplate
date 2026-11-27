---
title: Feature Flag Reference
description: Every seeded feature flag with its rollout, sub-keys, bounds, and gates, and the metadata and update rules of the admin API.
---

# Feature Flag Reference

This page lists the seeded flags and the rules of their values, for a developer who looks up what a flag gates or which bounds a sub-key accepts.

## Table of Contents

- [Related Documents](#related-documents)
- [Seeded flags](#seeded-flags)
- [Metadata rules](#metadata-rules)
- [Update rules](#update-rules)

## Related Documents

- [Feature Flag][ref-doc-concept-feature-flag]: how a flag is evaluated, targeted, rolled out, and cached
- [Feature Flag Guide][ref-doc-guide-feature-flag]: gate a route, read a sub-key, and add a flag
- [Database Reference][ref-doc-reference-database-feature-flag]: the seeded rows per environment
- [Configuration Reference][ref-doc-reference-configuration-feature-flag]: the `featureFlag` keys
- [Status Codes][ref-doc-reference-status-codes-feature-flag]: the code and message of each exception named here

## Seeded flags

The seed (`src/migration/data/migration.feature-flag.data.ts`) writes the same eight flags in every environment. Each is enabled with a `rolloutPercent` of 100 and an empty allow-list (`targetUserIds`). A sub-key reads its value from the row at runtime. The seeded row holds each number, no config key repeats it, and the admin metadata update changes it on the row.

### `loginWithGoogle`

- Description: `Enable login with Google`.
- Sub-keys: `signUpAllowed` (boolean, `true`): whether Google sign-in may create a user. It is read by `UserRegistrationService`.
- Gates: the Google login route of the public scope.

### `loginWithApple`

- Description: `Enable login with Apple`.
- Sub-keys: `signUpAllowed` (boolean, `true`): whether Apple sign-in may create a user. It is read by `UserRegistrationService`.
- Gates: the Apple login route of the public scope.

### `loginWithCredential`

- Description: `Enable login with Credential`.
- Sub-keys:

    | Sub-key | Seeded | Bounds | Meaning | Read by |
    | --- | --- | --- | --- | --- |
    | `passwordMaxAttempts` | `5` | integer 3 to 10 | Failed passwords before the account locks | `UserPasswordService`, `AnalyticFraudService`, `AnalyticAnomalyService` |
    | `passwordLockDurationInMinutes` | `15` | integer 5 to 1440 | Minutes the sign-in stays locked | `UserPasswordService` |

- Gates: the credential login route of the public scope.

### `loginWithPasskey`

- Description: `Enable login with passkey`.
- Sub-keys: none.
- Gates: the two passkey login routes of the public scope, the challenge and the login.
- Rule: passkey sign-in reads `loginWithPasskey` alone. Registering a passkey reads `mfa` and its `passkeyAllowed`, never `loginWithPasskey`.

### `mfa`

- Description: `Enable multi-factor authentication, per method`.
- Sub-keys:

    | Sub-key | Seeded | Bounds | Meaning | Read by |
    | --- | --- | --- | --- | --- |
    | `totpAllowed` | `true` | boolean | Whether TOTP is offered and accepted. Off, it closes enrollment, and a stored TOTP factor is neither offered at login nor accepted | `MfaService` |
    | `passkeyAllowed` | `true` | boolean | Whether passkeys are offered and accepted. Off, it closes enrollment, and a stored passkey is neither offered at login nor accepted | `MfaService` |
    | `passkeyMaxPerUser` | `10` | integer 1 to 20 | Passkeys a user may register | `MfaPasskeyService` |
    | `mfaMaxAttempts` | `5` | integer 3 to 10 | Failed second-factor attempts before the MFA lock | `MfaService` |
    | `mfaLockDurationInMinutes` | `15` | integer 5 to 1440 | Minutes the MFA lock lasts | `MfaService` |

- Gates: every `/shared/mfa/*` route. Off, each answers `disabled`.
- Rule: the one flag that switches a security control. Off, or with a method's sub-key off, a stored factor is neither offered nor accepted, and a user with no factor left that applies signs in with no MFA challenge, as an account with MFA off. Stored factors and backup codes stay, and the admin reset acts on them whatever the flag says ([MFA][ref-doc-concept-mfa]).

### `signUp`

- Description: `Enable user sign up`.
- Sub-keys: none.
- Gates: the sign-up route of the public scope.

### `changePassword`

- Description: `Enable change password feature`.
- Sub-keys: `forgotAllowed` (boolean, `true`): whether a forgot-password request, the reset-password MFA options, and a reset are accepted. It is read by `UserPasswordService`.
- Gates: the forgot-password, reset-password, and reset-password MFA options routes of the public scope, and the change-password route of the shared scope.

### `workspace`

- Description: `Enable the workspace and project router surface, including invitation and join request`.
- Sub-keys:

    | Sub-key | Seeded | Bounds | Meaning | Read by |
    | --- | --- | --- | --- | --- |
    | `invitationAllowed` | `true` | boolean | Whether invites may be listed, created, resent, revoked, claimed, or previewed by token, and a sign-up may carry an invite token | `WorkspaceInviteService` |
    | `joinRequestAllowed` | `true` | boolean | Whether join requests and the public workspace preview by slug are open | `WorkspaceService`, `WorkspaceJoinRequestService` |
    | `maxWorkspacesPerUser` | `10` | integer 1 to 100 | Workspaces a user may own | `WorkspaceService` |
    | `inviteExpiresInDays` | `7` | integer 1 to 30 | Default invite lifetime | `WorkspaceInviteService` |
    | `joinRequestExpiresInDays` | `7` | integer 1 to 30 | Join request lifetime | `WorkspaceJoinRequestService` |

- Gates: every `/user` and `/public` route of the workspace and project modules, the workspace analytic routes of the user scope, and the shared workspace activity-log list. Admin routes carry no flag.

## Metadata rules

- Metadata is flat. A value is a `boolean`, a `number`, a `string`, or a homogeneous `string[]` or `number[]`. A nested object, a nested array, a mixed array, and `boolean[]` are refused.
- A key matches `/^[a-z][a-zA-Z0-9]*$/` (`FeatureFlagMetadataKeyRegex`) and has at most 64 characters. A flag holds at most 50 keys.
- A string value has 1 to 500 characters. An array has 1 to 100 items, each string at most 500 characters.
- A value is never empty: an empty string and an empty array are refused.
- A numeric sub-key has a zod schema in `src/modules/feature-flag/validations/feature-flag.metadata.validation.ts`, and its bounds are in the tables above.
- Per-feature configuration lives in metadata. Per-user rollout lives in `targetUserIds` and `rolloutPercent`.

## Update rules

- The admin API updates values only. It never adds or deletes a flag, and it never adds or removes a metadata key.
- The status update replaces three values together: `isEnable`, `rolloutPercent` (integer 0 to 100), and `targetUserIds` (at most 1000 Mongo ids, `[]` clears the list). An id that no user row holds answers `UserNotFoundException` before the transaction opens, and a duplicate id is stored once.
- The metadata update replaces the values of the stored keys and runs two checks in order:
    - The request schema checks the metadata rules above, a numeric sub-key's bounds, and its number type. A value that fails answers `RequestValidationException` (422).
    - The service compares the keys and the value types with the stored metadata: the request must carry the same keys and the same value types, and an array cannot change its element type. A request that breaks that match, or targets a flag with no stored metadata, answers `FeatureFlagInvalidMetadataException` (400).
- A flag id no row holds answers `FeatureFlagNotFoundException` (404).
- Each update commits with an invalidation row for the flag's cache entry and lease ([Caching][ref-doc-concept-feature-flag-caching]).
- The admin routes need the `featureFlag` policy: `read` for the list, and `read` and `update` for both updates. Both lists take `search` on `key` and an `orderBy` of `latest` or `key`. The admin list pages by offset. The system list pages by cursor and takes a system API key and no JWT.

<!-- REFERENCES -->

[ref-doc-concept-feature-flag]: ../concepts/feature-flag.md
[ref-doc-concept-feature-flag-caching]: ../concepts/feature-flag.md#caching
[ref-doc-concept-mfa]: ../concepts/mfa.md
[ref-doc-guide-feature-flag]: ../guides/feature-flag.md
[ref-doc-reference-database-feature-flag]: database.md#featureflag
[ref-doc-reference-configuration-feature-flag]: configuration.md#featureflag
[ref-doc-reference-status-codes-feature-flag]: status-codes.md#feature-flag
