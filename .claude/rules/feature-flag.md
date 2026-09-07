# Feature flags — keys, metadata, gating

Detail in `docs/feature-flag.md`. Where the decorator sits in the stack is governed by `rules/http.md` and `rules/security.md`; this file is the feature-flag-specific rule set.

## Naming — camelCase, and it is enforced

- **A flag key is camelCase** — `loginWithGoogle`, `changePassword`. Not `login_with_google`, not `LOGIN_WITH_GOOGLE`. Same uniform-wire rule as everything else (`rules/naming.md`).
- **A metadata key is camelCase too, and this is a HARD validation** — `FeatureFlagUpdateMetadataRequestSchema` rejects any key that fails `/^[a-z][a-zA-Z0-9]*$/`. A `forgot_allowed` sent to the update-metadata endpoint fails validation, it does not reach the database. The regex is the single source of truth for the rule; do not loosen it to admit a snake_case import.
- **A gate reference is the bare flag key** — `@FeatureFlagProtected('changePassword')`. A dotted `key.metadataKey` is rejected: `validateFeatureFlagGuard` throws `predefinedKeyEmpty` when the path or any segment of it is empty, and `predefinedKeyLengthExceeded` on the SECOND segment.

## Metadata shape

- **Flat only.** No nested object — `metadata.a.b` is rejected by the constraint.
- **Values are `boolean | number | string`, or a homogeneous `string[]` / `number[]`.** A mixed array (`[1, 'a']`), a nested array, or `boolean[]` fails validation. An array value is data only; it is never a gate value.
- **An array value cannot change element type on update.** `checkMetadataKey` treats `string[]` and `number[]` as distinct types, and an empty array counts as an empty value (rejected), same as `''`.
- **Keys are frozen; only values change.** The admin API updates values, never adds or removes a metadata key — schema consistency is the contract.
- **A metadata sub-key used as a gate requires a boolean value.** `FeatureFlagService.validateFeatureFlagMetadata(key, metadataKey)` throws `predefinedKeyTypeInvalid` when the value is not boolean, and `serviceUnavailable` (503) when it is `false`.
- Per-feature config lives in metadata; per-user rollout lives in `targetUserIds` and `rolloutPercent`, never in metadata.

## Gating

- A route is gated by `@FeatureFlagProtected('<key>')` — the bare key, never a bare `@UseGuards`. Where it sits in the decorator stack is `rules/http.md`.
- **`@FeatureFlagProtected()` is NOT authentication.** It gates on flag state only; apply the auth guards separately when the route needs a user.
- **A metadata sub-key is asserted in the SERVICE, never in the decorator (HARD).** The decorator answers only "is this feature on at all". Whether the feature currently permits this particular operation is a business condition, so it is a guard clause at the top of the service method — `await this.featureFlagService.validateFeatureFlagMetadata('<key>', '<metadataKey>')` before any work. Written into the decorator it would gate one route instead of every caller of the method, and `rules/http.md` already forbids a guard from holding a business rule.
- Read `docs/feature-flag.md` before adding or changing a flag.

## Rollout and targeting

- **`targetUserIds` is an allow-list that bypasses rollout entirely.** A targeted user passes even at `rolloutPercent: 0`.
- **Rollout buckets stickily.** `md5('<key>:<identifier>')` salted by the flag key, so the same caller always lands in the same bucket for a given flag and does not land on the same side of every flag at once.
- **`isEnable: false` outranks both.** A targeted user is still rejected when the flag is globally off — that is what makes it a kill switch.

## Anonymous callers — fail closed

- **An authenticated caller is always bucketed by `userId`, and the `x-anonymous-id` header is ignored entirely.** If the header could override it, any user could move their own bucket by sending one.
- **With no authenticated user:** `rolloutPercent: 100` passes without the header ever being read; anything below 100 buckets by `x-anonymous-id`, and a caller that sends none or sends a malformed one is REJECTED. Fail closed — a gate that silently admits everyone is not a gate.
- The header name and the length/charset bounds come from `featureFlag.anonymous.*` config, never a literal in the service. An unbounded client string must not reach the hash, the logs, or a cache key; an invalid value is treated as absent.
- **`targetUserIds` applies to authenticated callers only** — targeting is by `userId`, which an anonymous caller does not have.

## A flag is never an authorization boundary (HARD)

A feature flag is progressive-exposure machinery: canary, load control, staged launch. The anonymous bucketing key is client-supplied and **forgeable by design** — a caller who dislikes their bucket sends a different value and retries. Never place an entitlement or a security boundary behind a `rolloutPercent`. A feature that must not be seen is gated by `isEnable: false` or by authorization.

## Restrictions

- Flags cannot be created or deleted through the admin API — they are seeded (`migration.feature-flag.data.ts`, `rules/seeding.md`).
- Cache is best-effort: a read/write/delete failure falls through to the database.
- **An unknown flag key is a SERVER misconfiguration, not a disabled feature.** It throws `predefinedKeyNotFound` (HTTP 500), distinct from the 503 that a disabled flag, a false metadata sub-key, or a lost rollout bucket returns. There is no fail-open in either direction.
