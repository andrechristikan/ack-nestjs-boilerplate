---
paths:
    - 'src/modules/feature-flag/**'
    - 'src/migration/data/migration.feature-flag.data.ts'
---

# Feature flags

Decorator position is `guards.md`. This file is key shape, metadata, gating, and rollout.

## Keys

- A flag key is an `EnumFeatureFlagKey` member and a metadata sub-key code reads is an `EnumFeatureFlagMetadataKey` member (`src/modules/feature-flag/enums/feature-flag.enum.ts`), named by the seed data and every caller, never a literal. A flag key is camelCase (`loginWithGoogle`). A metadata key is camelCase and validated: `FeatureFlagUpdateMetadataRequestSchema` (`src/modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto.ts`) rejects any key failing `/^[a-z][a-zA-Z0-9]*$/`. The regex is the single source of the rule.
- A gate reference is the member: `@FeatureFlagProtected(EnumFeatureFlagKey.changePassword)`. The decorator checks the key when the route is decorated (`guards.md`).

## Metadata

- Flat only. Values are `boolean | number | string` or a homogeneous `string[]` / `number[]`; a mixed or nested array, `boolean[]`, an empty array, and `''` fail. An array value cannot change element type on update.
- A metadata sub-key used as a gate holds a boolean and is asserted in the calling service, never in the decorator (`service.md`, Shape).
- Keys are frozen; the admin API updates values and never adds or removes a key.
- Per-feature config lives in metadata; per-user rollout lives in `targetUserIds` and `rolloutPercent`, never in metadata.

## Gating

`@FeatureFlagProtected(EnumFeatureFlagKey.<member>)` answers only "is this feature on". It is not authentication; the auth guards are separate. `isEnable: false` outranks targeting and rollout, which is what makes it a kill switch.

## Rollout and targeting

- `targetUserIds` is an allow-list that bypasses rollout; a targeted user passes at `rolloutPercent: 0`. It applies to authenticated callers only.
- Rollout buckets stickily: `sha256Hash('<key>:<identifier>')`, the first 8 hex characters modulo 100 (`FeatureFlagService.isInRollout`, `src/modules/feature-flag/services/feature-flag.service.ts`), so one caller lands in the same bucket for a flag and not on the same side of every flag.
- An authenticated caller is bucketed by `userId`; the `x-anonymous-id` header is ignored for them. With no user, `rolloutPercent: 100` passes without reading the header; anything lower buckets by `x-anonymous-id`, and a caller sending none or a malformed one is rejected. Fail closed. The header is `FeatureFlagAnonymousIdHeaderName`; the bounds come from `featureFlag.anonymous.*` config; an invalid value is treated as absent and never reaches the hash, a log, or a key.
- A flag is never an authorization boundary: the anonymous key is client-supplied and forgeable by design. An entitlement is gated by authorization or `isEnable: false`.

## Restrictions

- Flags are seeded (`src/migration/data/migration.feature-flag.data.ts`, `seeding.md`), not created or deleted through the admin API.
- A cache read or set error other than a connection error falls through to the database; a connection error answers 503; an update invalidates through the `cache.invalidate` job (`cache.md`).
- A gated key no row holds throws `FeatureFlagNotConfiguredException` (`notConfigured`, HTTP 500, `FeatureFlagService.validateFeatureFlag`): a missing seed row is our bug, reported to Sentry. It is not an optional integration's not-configured 404 (`exceptions.md`). `FeatureFlagNotFoundException` (`notFound`, HTTP 404) answers only an admin route naming a flag id no row holds (`FeatureFlagService.updateStatusByAdmin`). A disabled flag, a false sub-key, an anonymous caller with no id, and a lost bucket throw `FeatureFlagDisabledException` (`disabled`, HTTP 404), so a gated feature answers as absent. No fail-open either way.
