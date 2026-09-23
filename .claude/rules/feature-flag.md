---
paths:
  - "src/modules/feature-flag/**"
---

# Feature flags

Decorator position is `http.md`. This file is key shape, metadata, gating, and rollout.

## Keys

- A flag key is camelCase (`loginWithGoogle`). A metadata key is camelCase and validated:
  `FeatureFlagUpdateMetadataRequestSchema`
  (`src/modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto.ts:10`)
  rejects any key failing `/^[a-z][a-zA-Z0-9]*$/`. The regex is the single source of the rule.
- A gate reference is the bare key: `@FeatureFlagProtected('changePassword')`. A dotted
  `key.metadataKey` is rejected by `validateFeatureFlagGuard` (`predefinedKeyEmpty` on an
  empty segment, `predefinedKeyLengthExceeded` on a second one).

## Metadata

- Flat only. Values are `boolean | number | string` or a homogeneous `string[]` /
  `number[]`; a mixed or nested array, `boolean[]`, an empty array, and `''` fail. An array
  value cannot change element type on update.
- Keys are frozen; the admin API updates values and never adds or removes a key.
- A metadata sub-key used as a gate holds a boolean and is asserted in the domain, never in
  the decorator: `await this.featureFlagDomain.validateFeatureFlagMetadata(key, metadataKey)`
  (`src/modules/feature-flag/domains/feature-flag.domain.ts:104`) at the top of the domain
  method; it throws `predefinedKeyTypeInvalid` for a non-boolean and `serviceUnavailable`
  (503) for `false`. Written into the decorator it would gate one route instead of every
  caller.
- Per-feature config lives in metadata; per-user rollout lives in `targetUserIds` and
  `rolloutPercent`, never in metadata.

## Gating

`@FeatureFlagProtected('<key>')` answers only "is this feature on". It is not
authentication; the auth guards are separate. `isEnable: false` outranks targeting and
rollout, which is what makes it a kill switch.

## Rollout and targeting

- `targetUserIds` is an allow-list that bypasses rollout; a targeted user passes at
  `rolloutPercent: 0`. It applies to authenticated callers only.
- Rollout buckets stickily: `sha256Hash('<key>:<identifier>')`, the first 8 hex characters
  modulo 100 (`feature-flag.domain.ts:56`), so one caller lands in the same bucket for a
  flag and not on the same side of every flag.
- An authenticated caller is bucketed by `userId`; the `x-anonymous-id` header is ignored
  for them. With no user, `rolloutPercent: 100` passes without reading the header; anything
  lower buckets by `x-anonymous-id`, and a caller sending none or a malformed one is
  rejected. Fail closed. The header name and bounds come from `featureFlag.anonymous.*`
  config; an invalid value is treated as absent and never reaches the hash, a log, or a key.
- A flag is never an authorization boundary: the anonymous key is client-supplied and
  forgeable by design. An entitlement is gated by authorization or `isEnable: false`.

## Restrictions

- Flags are seeded (`src/migration/data/migration.feature-flag.data.ts`, `seeding.md`), not
  created or deleted through the admin API.
- Cache is best-effort: a read, write, or delete failure falls through to the database.
- An unknown key is a server misconfiguration: `predefinedKeyNotFound` (HTTP 500), distinct
  from the 503 of a disabled flag, a false sub-key, or a lost bucket. No fail-open either way.
