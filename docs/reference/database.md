---
title: Database Reference
description: The Prisma models and their collections, the composite types, and the rows each seed writes in every environment.
---

# Database Reference

This page lists the facts of the database, for a developer who looks up a model, a composite type, or a seeded value.

## Table of Contents

- [Related Documents](#related-documents)
- [Models](#models)
- [Relations and referential actions](#relations-and-referential-actions)
- [Composite types](#composite-types)
- [Seeded rows](#seeded-rows)
- [Rows removed by remove](#rows-removed-by-remove)

## Related Documents

- [Database][ref-doc-concept-database]: the client, transactions, audit stamping, and soft delete
- [Seed Guide][ref-doc-guide-seed]: run, add, and remove the seeds
- [Commands][ref-doc-reference-commands]: the `db:*` and `migration*` scripts
- [Configuration Reference][ref-doc-reference-configuration-database]: the `database` keys

## Models

The table lists the models alphabetically. Every model in `prisma/schema.prisma` maps to a collection through `@@map`. A repository addresses a model by its Prisma name on `databaseService.client.<model>`, and MongoDB shows the collection name.

Every model has an `id` and `createdAt`, `createdBy`. A model whose rows are updated adds `updatedAt`, `updatedBy`. `User`, `Workspace`, `Project`, `ApiKey`, and `UserMobileNumber` add `deletedAt`, `deletedBy` and are the soft-deletable models.

| Model | Collection | Holds |
| --- | --- | --- |
| `ActivityLog` | `ActivityLogs` | The audit trail of user actions, with the `apiKeyId` of the request that caused each entry |
| `AnalyticSnapshot` | `AnalyticSnapshots` | The last computed snapshot of each analytic signal |
| `AnalyticSnapshotItem` | `AnalyticSnapshotItems` | The ranked items of one snapshot run |
| `ApiKey` | `ApiKeys` | API key credentials: key, hash, type, active flag, and an optional start and end |
| `AuthSocialNonce` | `AuthSocialNonces` | Hashed social sign-in nonces until they expire |
| `CommonPassword` | `CommonPasswords` | Common passwords the password policy rejects |
| `Country` | `Countries` | Country reference data: names, codes, phone codes, continent, timezone |
| `Device` | `Devices` | Devices identified by fingerprint |
| `DeviceOwnership` | `DeviceOwnerships` | The link between a user and a device, with its push token |
| `FeatureFlag` | `FeatureFlags` | Feature toggles with a rollout percent and metadata |
| `FeatureFlagTarget` | `FeatureFlagTargets` | A user a flag targets |
| `ForgotPassword` | `ForgotPasswords` | Password reset tokens |
| `Mfa` | `Mfas` | A user's MFA state: backup codes, attempt counter, and lockout |
| `MfaChallenge` | `MfaChallenges` | A one-time challenge for one purpose: `login`, `passwordless`, `registration`, `reauthentication`, or `resetPassword` |
| `MfaPasskey` | `MfaPasskeys` | A registered passkey credential |
| `MfaTotp` | `MfaTotps` | A user's TOTP secret and its confirmation state |
| `Notification` | `Notifications` | Notification records |
| `NotificationDelivery` | `NotificationDeliveries` | The per-channel delivery outcome of a notification |
| `NotificationUserSetting` | `NotificationUserSettings` | A user's preference per channel and type |
| `Outbox` | `Outboxes` | The side-effect rows the outbox dispatches, scrubbed after `outbox.retentionInMs` and never deleted |
| `PasswordHistory` | `PasswordHistories` | Previous password hashes for reuse checks |
| `Policy` | `Policies` | The `(subject, action[])` row a role grants, evaluated through CASL |
| `Project` | `Projects` | Projects inside a workspace |
| `ProjectMember` | `ProjectMembers` | Project membership and role |
| `Role` | `Roles` | A role with its type and an immutability flag |
| `Session` | `Sessions` | Refresh sessions, one per device ownership |
| `TermPolicy` | `TermPolicies` | Term policy documents and versions |
| `TermPolicyRecipient` | `TermPolicyRecipients` | One marker per user and term policy for the publication email |
| `TermPolicyUserAcceptance` | `TermPolicyUserAcceptances` | A user's acceptance of one policy version |
| `User` | `Users` | User accounts |
| `UserMobileNumber` | `UserMobileNumbers` | A user's mobile numbers and their verification state; a deleted number is rewritten to `deleted-{id}` |
| `UserSocial` | `UserSocials` | The social provider and subject linked to a user |
| `Verification` | `Verifications` | Email, mobile number, and reauthentication verification tokens |
| `Workspace` | `Workspaces` | Workspaces |
| `WorkspaceInvite` | `WorkspaceInvites` | Workspace invitations |
| `WorkspaceJoinRequest` | `WorkspaceJoinRequests` | Requests to join a public workspace |
| `WorkspaceMember` | `WorkspaceMembers` | Workspace membership and role |

## Relations and referential actions

Prisma on MongoDB runs in `relationMode = "prisma"`, so the client emulates every referential action with extra queries. Every relation is named on both sides and declares `onDelete` and `onUpdate`. `NoAction` is not used. The parent is the referenced model and the child is the model that holds the relation scalar; `prisma/schema.prisma` is the full list of relations.

| Relation | `onDelete` | Meaning |
| --- | --- | --- |
| `Policy.role` | `Cascade` | A role's policies are deleted with it |
| `User.lastWorkspace` | `SetNull` | A preference pointer, cleared when the `workspace` seed's `remove()` hard-deletes a seeded workspace; no application code hard-deletes a `Workspace` |
| every other relation | `Restrict` | A parent with children is not deleted |

- `onUpdate` never fires, because an `ObjectId` id never changes; `Restrict` states that every relation declares both actions.
- The soft-deletable parents (`User`, `Workspace`, `Project`, `ApiKey`, `UserMobileNumber`) are never hard-deleted by application code. A seed's `remove()` deletes the children first. The one exception is `User.lastWorkspace`: `migration:remove` deletes workspaces before users, and `SetNull` clears the pointer ([Rows removed by `remove`](#rows-removed-by-remove)).
- A `Role` that users hold, and a `TermPolicy` that has recipients or acceptances, are refused by `Restrict`.

## Composite types

A composite type is an embedded sub-document, declared with `type` in `prisma/schema.prisma` and stored inline in its parent with no collection of its own.

### GeoLocation

The location derived from a client's IP address with `geoip-lite`. Used by `Session.geoLocation` and `ActivityLog.geoLocation`, both optional. The value is `null` when the request has no client IP or the lookup finds nothing, and `ipAddress` is `null` when there is no client IP.

| Field       | Type     | Holds                          |
| ----------- | -------- | ------------------------------ |
| `latitude`  | `Float`  | Latitude                       |
| `longitude` | `Float`  | Longitude                      |
| `country`   | `String` | ISO country code, such as `ID` |
| `region`    | `String` | Region code                    |
| `city`      | `String` | City name                      |

### UserAgent

The client description parsed from the `User-Agent` header with `ua-parser-js`. Used by `Session.userAgent` and `ActivityLog.userAgent`, both required. `RequestUtil.parseUserAgent` builds it, falls back to `null` for each field, and stores a sub-type whose fields are all `null` as `null`. A request with no `User-Agent` header stores every sub-type as `null`.

| Field | Type | Holds |
| --- | --- | --- |
| `ua` | `String?` | The raw user-agent string |
| `browser` | `UserAgentBrowser?` | `name`, `version`, `major`, `type`, all `String?` |
| `cpu` | `UserAgentCpu?` | `architecture` as `String?` |
| `device` | `UserAgentDevice?` | `type`, `vendor`, `model`, all `String?` |
| `engine` | `UserAgentEngine?` | `name`, `version`, both `String?` |
| `os` | `UserAgentOs?` | `name`, `version`, both `String?` |

### UserPhoto

A user's profile photo in S3. Used by `User.photo`, optional.

| Field | Type | Holds |
| --- | --- | --- |
| `bucket` | `String` | The bucket name |
| `key` | `String` | The object key |
| `cdnUrl` | `String?` | The CDN URL, `null` for a bucket with no CDN |
| `completedUrl` | `String` | The full S3 URL |
| `mime` | `String` | The MIME type, such as `image/jpeg` |
| `extension` | `String` | The file extension, such as `jpg` |
| `access` | `EnumAwsS3Accessibility` | `public` or `private` |

### TermPolicyContent

A localized content file of a term policy, stored in S3. Used by `TermPolicy.contents`, a list.

| Field | Type | Holds |
| --- | --- | --- |
| `language` | `String` | The language code, such as `en` |
| `bucket` | `String` | The bucket name |
| `key` | `String` | The object key |
| `cdnUrl` | `String?` | The CDN URL, `null` for a bucket with no CDN |
| `completedUrl` | `String` | The full S3 URL |
| `mime` | `String` | The MIME type, such as `text/x-handlebars-template` |
| `extension` | `String` | The file extension, such as `hbs` |
| `access` | `EnumAwsS3Accessibility` | `public` or `private` |
| `size` | `Int` | The size in bytes |

### MfaChallengeDevice

The device a passkey or login challenge was issued for. Used by `MfaChallenge.device`, optional.

| Field | Type | Holds |
| --- | --- | --- |
| `fingerprint` | `String` | The device fingerprint |
| `name` | `String?` | The device name |
| `platform` | `EnumDevicePlatform` | The device platform |
| `encryptedNotificationToken` | `String?` | The push token, encrypted |

## Seeded rows

`pnpm migration:seed` writes these rows. The `role` seed lower-cases the role names and the `user` seed lower-cases the emails. Every other value is written as the data file holds it: `Indonesia`, `IDN`, and `Asia/Jakarta`, the flag keys, the API keys, and the password keep their case. Every seeded row names the seed actor, the superadmin with the fixed id `6aac171205d6fc2f45c6d616` (`MigrationUserSuperAdminId`), as `createdBy` and, where the model has it, as `updatedBy`. The exception is the `userTermPolicyAccepted` activity row, whose `createdBy` is the account itself.

| Seed | `local` | `development`, `staging`, `production` |
| --- | --- | --- |
| `apiKey` | two keys | none |
| `country` | one country | one country |
| `featureFlag` | eight flags | eight flags |
| `role` | three roles | three roles |
| `policy` | the admin role's policies | the admin role's policies |
| `termPolicy` | four term policies | four term policies |
| `user` | three users with a published password | three users with a random password |
| `workspace` | one personal workspace per user | one personal workspace per user |
| `commonPassword` | the common-password list | the common-password list |
| `awsS3Config` | S3 bucket policies when S3 is configured, no database row | the same |
| `templateEmailNotification` | SES email templates when SES is configured, no database row | the same |

`pnpm migration:seed` runs the first nine seeds in the order `apiKey`, `country`, `featureFlag`, `role`, `policy`, `termPolicy`, `user`, `workspace`, `commonPassword`. `awsS3Config` and `templateEmailNotification` run by their own command ([Seed Guide][ref-doc-guide-seed]).

### apiKey

The seed writes these keys for `APP_ENV=local` only. The data file holds the bare key, and `ApiKeyCredentialUtil.createKey` prepends `<env>_`, so the key a client sends carries the prefix. The keys and the secret are published in this repository.

| Name | Type | Key | Secret |
| --- | --- | --- | --- |
| `api key default` | `default` | `local_fyFGb7ywyM37TqDY8nuhAmGW5` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` |
| `api key system` | `system` | `local_UTDH0fuDMAbd1ZVnwnyrQJd8Q` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` |

### country

| Name | `alpha2Code` | `alpha3Code` | `phoneCode` | Continent | Timezone |
| --- | --- | --- | --- | --- | --- |
| `Indonesia` | `ID` | `IDN` | `62` | `Asia` | `Asia/Jakarta` |

### featureFlag

Every flag is enabled with a rollout of 100 in every environment.

| Key | Description | Metadata |
| --- | --- | --- |
| `loginWithGoogle` | `Enable login with Google` | `signUpAllowed`: `true` |
| `loginWithApple` | `Enable login with Apple` | `signUpAllowed`: `true` |
| `loginWithCredential` | `Enable login with Credential` | `passwordMaxAttempts`: `5`, `passwordLockDurationInMinutes`: `15` |
| `loginWithPasskey` | `Enable login with passkey` | none |
| `mfa` | `Enable multi-factor authentication, per method` | `totpAllowed`: `true`, `passkeyAllowed`: `true`, `passkeyMaxPerUser`: `10`, `mfaMaxAttempts`: `5`, `mfaLockDurationInMinutes`: `15` |
| `signUp` | `Enable user sign up` | none |
| `changePassword` | `Enable change password feature` | `forgotAllowed`: `true` |
| `workspace` | `Enable the workspace and project router surface, including invitation and join request` | `invitationAllowed`: `true`, `joinRequestAllowed`: `true`, `maxWorkspacesPerUser`: `10`, `inviteExpiresInDays`: `7`, `joinRequestExpiresInDays`: `7` |

### role

| Role         | Type         | Description        | Immutable |
| ------------ | ------------ | ------------------ | --------- |
| `superadmin` | `superAdmin` | `super admin role` | yes       |
| `admin`      | `admin`      | `admin role`       | yes       |
| `user`       | `user`       | `user role`        | yes       |

- The seed upserts each role on its lower-cased name.
- It has no prerequisite.

### policy

The `policy` seed writes one row per `EnumPolicySubject` for the `admin` role, each carrying every `EnumPolicyAction`. The `superadmin` role gets none, because `superAdmin` bypasses the policy check, and the `user` role gets none.

- The subjects are `all`, `apiKey`, `role`, `user`, `session`, `activityLog`, `passwordHistory`, `termPolicy`, `featureFlag`, `device`, `workspace`, `project`, and `analytic`.
- The actions are `manage`, `read`, `create`, `update`, and `delete`.
- The seed reads the roles `superadmin`, `admin`, and `user` by name. All three must exist: when any is missing it logs a warning and writes nothing.
- Each row is an upsert on `(roleId, subject)`.

### termPolicy

| Type             | Version | Language | Status      |
| ---------------- | ------- | -------- | ----------- |
| `termsOfService` | `1`     | `en`     | `published` |
| `privacy`        | `1`     | `en`     | `published` |
| `cookies`        | `1`     | `en`     | `published` |
| `marketing`      | `1`     | `en`     | `published` |

- Each missing row is created with a `publishedAt` stamp and one `en` entry in `contents`.
- The bodies are Handlebars templates in `src/modules/term-policy/templates/`, one per type: `term-policy.term.en.hbs`, `term-policy.privacy.en.hbs`, `term-policy.cookies.en.hbs`, and `term-policy.marketing.en.hbs`.
- With S3 configured the seed uploads each body to the private bucket, copies it to the public path, and stores the item. Without S3 it logs a warning, stores the mapped presign data, and uploads nothing.
- The seed has no prerequisite. It fails when a required type (`termsOfService`, `privacy`) is not published afterward.

### user

The `user` seed writes the same three accounts in every environment.

| Email | Username | Name | Role | Country |
| --- | --- | --- | --- | --- |
| `superadmin@mail.com` | `superadmin` | `super admin` | `superadmin` | `ID` |
| `admin@mail.com` | `admin` | `admin` | `admin` | `ID` |
| `user@mail.com` | `user` | `user` | `user` | `ID` |

- With `APP_ENV=local` every account has the password `aaAA@123`, published in this repository.
- In every other environment the data holds `password: null`, `AuthPasswordService.createRandom()` draws a password for each new account, and the seed prints `<email> <password>` once on standard output.
- The superadmin row carries the fixed id `MigrationUserSuperAdminId`. The other rows get an id drawn before the transaction.
- Each account is active, verified, and signed up from `system` with `credential`.
- Each new account also gets, in the same transaction: a password history row of type `admin`, a used and verified email `Verification`, a `TermPolicyUserAcceptance` for each required type (`termsOfService`, `privacy`), a `NotificationUserSetting` for every channel (`push`, `email`, `sms`, `inApp`, `silent`) and type (`securityAlert`, `transactional`, `userActivity`, `marketing`), each active, an empty `Mfa` row, and its activity rows.
- A user whose email already exists is left as it is, apart from `updatedBy`.
- Missing dependency: the seed logs a warning and writes nothing when a seeded role or country is missing, or a required term policy has no published version.

The activity rows of a new account:

| Action | Belongs to | `createdBy` | Metadata |
| --- | --- | --- | --- |
| `userCreated` | The superadmin | The superadmin | empty |
| `userCreatedByAdmin` | The admin and the user | The superadmin | `actorUserId`, `timestamp` |
| `userEmailVerified` | Each account | The superadmin | empty |
| `userTermPolicyAccepted`, one per required type | Each account | The account itself | empty |
| `adminUserCreated`, one per new admin or user | The superadmin | The superadmin | `targetUserId`, `targetUsername`, `timestamp` |

### workspace

- Each seeded user gets one personal workspace named `{username}'s workspace` (`workspace.personalNamePattern`), such as `superadmin's workspace`, with the user as its `owner` member.
- The slug is the prefix `w-` followed by random lower-case characters. The 30 characters (`workspace.slugMaxLength`) include the `w-`. The seed draws `workspace.slugMaxAttempts` candidates and retries on a slug collision. When every candidate collides, the seed throws `AppUnknownException` and the run exits 1.
- The seed skips a user who already owns a live workspace.
- Missing dependency: the seed needs the `user` seed first, and it logs a warning and writes nothing when a seeded user is missing.

### commonPassword

The data file holds the first 3000 entries of the National Cyber Security Centre's 100k most-used passwords list (SecLists, `Passwords/Common-Credentials`) that pass the filter: 8 to 64 characters long, lower-cased, and de-duplicated. The cut of 3000 runs after the filter. The seed has no prerequisite, inserts in batches of `database.seedBatchSize`, and skips values that exist.

### awsS3Config

The seed sets the policies of the public and the private bucket and writes no database row.

- `AwsS3Service` applies the bucket policies of the public and the private bucket and the public bucket's ACL setting.
- Missing dependency: the seed logs a warning and skips when S3 is not configured or `AWS_S3_IAM_PRINCIPAL_ARN` is unset.
- Its `remove()` removes nothing.

### templateEmailNotification

The seed upserts the SES email template of each notification kind and writes no database row.

- The seed updates every template and creates the ones SES lacks, so a changed template syncs with `--type seed` alone.
- Missing dependency: the seed logs a warning and skips when SES is not configured.
- Its `remove()` deletes the SES template of each notification kind.

## Rows removed by `remove`

`pnpm migration:remove` runs `workspace`, then `user`, then `apiKey`, `featureFlag`, `country`, `policy`, `role`, `termPolicy`, and `commonPassword`. `workspace` runs before `user`, and the `workspace` removal reads the seeded users to find the seeded workspaces. `awsS3Config` and `templateEmailNotification` are outside it. Each seed's `remove()` deletes:

| Seed | `remove()` deletes |
| --- | --- |
| `apiKey` | every `ApiKey` row, a hard delete that `Restrict` refuses while an `ActivityLog` row names the key |
| `country` | every `Country` row |
| `featureFlag` | every `FeatureFlagTarget` and `FeatureFlag` row |
| `role` | every `Role` row |
| `policy` | every `Policy` row of the roles `superadmin`, `admin`, and `user` |
| `termPolicy` | every `TermPolicyUserAcceptance`, `TermPolicyRecipient`, and `TermPolicy` row |
| `commonPassword` | every `CommonPassword` row |
| `user` | every user and every row that depends on one: `NotificationDelivery`, `TermPolicyRecipient`, `Notification`, `NotificationUserSetting`, `ProjectMember`, `WorkspaceJoinRequest`, `WorkspaceInvite`, `WorkspaceMember`, `MfaChallenge`, `MfaTotp`, `Mfa`, `Session`, `DeviceOwnership`, `Verification`, `UserMobileNumber`, `PasswordHistory`, `ForgotPassword`, `ActivityLog`, `TermPolicyUserAcceptance`, `FeatureFlagTarget`, `UserSocial`, `MfaPasskey`, and `User`, in one transaction. `Device`, `Workspace`, and `Project` rows stay |
| `workspace` | only the seeded workspaces, found by the name `{username}'s workspace` with an owner membership of that user, and their project members, invites, join requests, projects, activity logs, and members, in one transaction |
| `templateEmailNotification` | the SES email template of each notification kind |
| `awsS3Config` | nothing |

<!-- REFERENCES -->

[ref-doc-concept-database]: ../concepts/database.md
[ref-doc-guide-seed]: ../guides/seed.md
[ref-doc-reference-commands]: commands.md#database-and-seeds
[ref-doc-reference-configuration-database]: configuration.md#database
