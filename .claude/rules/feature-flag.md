# Feature flags — keys, metadata, gating

Detail in `docs/feature-flag.md`. Guard order is governed by `rules/http.md` (slot #9) and `rules/security.md`; this file is the feature-flag-specific rule set.

## Naming — camelCase, and it is enforced

- **A flag key is camelCase** — `loginWithGoogle`, `changePassword`. Not `login_with_google`, not `LOGIN_WITH_GOOGLE`. Same uniform-wire rule as everything else (`rules/naming.md`).
- **A metadata key is camelCase too, and this is a HARD validation** — `IsFeatureFlagMetadataConstraint` rejects any key that fails `/^[a-z][a-zA-Z0-9]*$/`. A `forgot_allowed` sent to the update-metadata endpoint fails validation, it does not reach the database. The regex is the single source of truth for the rule; do not loosen it to admit a snake_case import.
- A nested gate reference joins the two with a dot: `@FeatureFlagProtected('changePassword.forgotAllowed')`. Max two levels (`key.metadataKey`); three throws `predefinedKeyLengthExceeded`.

## Metadata shape

- **Flat only.** No nested object — `metadata.a.b` is rejected by the constraint.
- **Values are `boolean | number | string`, or a homogeneous `string[]` / `number[]`.** A mixed array (`[1, 'a']`), a nested array, or `boolean[]` fails validation. An array value is data only; it is never a gate value.
- **An array value cannot change element type on update.** `checkMetadataKey` treats `string[]` and `number[]` as distinct types, and an empty array counts as an empty value (rejected), same as `''`.
- **Keys are frozen; only values change.** The admin API updates values, never adds or removes a metadata key — schema consistency is the contract.
- **A nested-key gate requires a boolean value.** `@FeatureFlagProtected('key.meta')` where `meta` is not boolean throws `predefinedKeyTypeInvalid`.
- Per-feature config lives in metadata; per-user rollout lives in `targetUserIds` and `rolloutPercent`, never in metadata.

## Gating

- A route is gated by `@FeatureFlagProtected('<key>')` — slot #9 in the decorator stack (`rules/http.md`), never a bare `@UseGuards`.
- **`@FeatureFlagProtected()` is NOT authentication.** It gates on flag state only; apply the auth guards separately when the route needs a user.
- Rollout is salted per flag key and evaluated only for an authenticated user not in `targetUserIds`. Read `docs/feature-flag.md` before adding or changing a flag.

## Restrictions

- Flags cannot be created or deleted through the admin API — they are seeded (`migration.feature-flag.data.ts`, `rules/migration.md`).
- Cache is best-effort: a read/write/delete failure falls through to the database. An unknown or disabled flag still returns 503 — there is no fail-open.
