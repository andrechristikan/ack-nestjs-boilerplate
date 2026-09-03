# MongoDB to PostgreSQL Migration Spec

## Table of Contents

- [Context](#context)
- [Issue Alignment](#issue-alignment)
- [Scope](#scope)
- [Executive Summary](#executive-summary)
- [Provider-Level Incompatibilities](#provider-level-incompatibilities)
  - [Datasource](#datasource)
  - [ObjectId Native Types](#objectid-native-types)
  - [Collection Mapping](#collection-mapping)
- [Model Rework Inventory](#model-rework-inventory)
  - [ApiKey](#apikey)
  - [Role, RoleAbility](#role-roleability)
  - [Country](#country)
  - [User](#user)
  - [UserMobileNumber](#usermobilenumber)
  - [Verification and ForgotPassword](#verification-and-forgotpassword)
  - [PasswordHistory](#passwordhistory)
  - [ActivityLog](#activitylog)
  - [Session](#session)
  - [Device and DeviceOwnership](#device-and-deviceownership)
  - [TwoFactor and Backup Codes](#twofactor-and-backup-codes)
  - [TermPolicy, TermPolicyContent, TermPolicyUserAcceptance](#termpolicy-termpolicycontent-termpolicyuseracceptance)
  - [FeatureFlag and Target Users](#featureflag-and-target-users)
  - [Notification and NotificationDelivery](#notification-and-notificationdelivery)
  - [NotificationUserSetting](#notificationusersetting)
- [Cross-Cutting Code Refactors](#cross-cutting-code-refactors)
- [PostgreSQL Best-Practice Design Issues](#postgresql-best-practice-design-issues)
  - [Embedded Domain Entities](#embedded-domain-entities)
  - [Array Fields as Relationships](#array-fields-as-relationships)
  - [Boolean State Duplicating Timestamp State](#boolean-state-duplicating-timestamp-state)
  - [Soft Delete and Uniqueness](#soft-delete-and-uniqueness)
  - [Native Types](#native-types)
  - [Table and Column Naming](#table-and-column-naming)
- [Suggested Migration Phases](#suggested-migration-phases)
  - [Phase 1: Schema Redesign](#phase-1-schema-redesign)
  - [Phase 2: Common Database and Request Infrastructure](#phase-2-common-database-and-request-infrastructure)
  - [Phase 3: Repository Refactor](#phase-3-repository-refactor)
  - [Phase 4: Service and Mapper Refactor](#phase-4-service-and-mapper-refactor)
  - [Phase 5: Seeds and Data Transfer](#phase-5-seeds-and-data-transfer)
  - [Phase 6: Test and Runtime Verification](#phase-6-test-and-runtime-verification)
- [Acceptance Checklist](#acceptance-checklist)

## Context

The current Prisma schema is MongoDB-first. It uses MongoDB `ObjectId` native types, collection names mapped from PascalCase model names, Prisma composite `type` blocks, embedded object arrays, scalar arrays, and MongoDB health checks.

The PostgreSQL migration is a breaking redesign. No backward-compatibility layer is carried forward. The target state is a relational Prisma schema using PostgreSQL native types, foreign keys, join tables for many-valued concepts that need integrity, and JSON only where the data is append-only or operationally opaque.

Primary Prisma compatibility facts used for this review:

- Prisma composite types are only available for MongoDB.
- Prisma maps PostgreSQL `Json` to `jsonb` by default.
- Prisma supports PostgreSQL scalar arrays, but relational tables are still the better fit when the values are entities, require referential integrity, need per-item metadata, or are queried independently.
- PostgreSQL UUID columns are represented as `String @db.Uuid`; because PostgreSQL 18.6 is the target and older PostgreSQL versions are not supported, use native PostgreSQL `uuidv7()` defaults through Prisma `dbgenerated`.

References:

- https://github.com/andrechristikan/ack-nestjs-boilerplate/issues/644
- https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference#naming-conventions
- https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/custom-model-and-field-names
- https://www.prisma.io/docs/orm/v6/prisma-client/special-fields-and-types/composite-types
- https://www.prisma.io/docs/orm/v6/overview/databases/postgresql
- https://www.prisma.io/docs/orm/v6/prisma-client/special-fields-and-types/working-with-scalar-lists-arrays
- https://www.prisma.io/docs/orm/v6/prisma-client/special-fields-and-types/working-with-json-fields
- https://www.prisma.io/docs/orm/v6/prisma-schema/data-model/unsupported-database-features
- https://www.prisma.io/docs/orm/v6/reference/prisma-schema-reference#uuid
- https://casl.js.org/v7/en/package/casl-prisma/

## Issue Alignment

GitHub issue `#644`, "[FEAT] Move to Postgres as default", frames the migration as a default-database change driven by domain growth. The current model now depends heavily on references, ownership, uniqueness, lifecycle state, and auditability, so PostgreSQL matches the application shape better than MongoDB. The owner agreed that PostgreSQL is the sweet spot and confirmed that MongoDB is historical rather than a domain requirement.

The issue proposes keeping MongoDB as a documented supported option. This spec is stricter because the current migration request explicitly does not care about backward compatibility. The implementation can still preserve a separate optional MongoDB documentation path later, but the primary work described here is a clean PostgreSQL default with no compatibility shims in runtime code.

The issue also notes sequencing: stale multi-tenant work lands before this migration starts. That matters because tenant ownership, unique indexes, partial indexes, seed data, and repository query scopes are all database-design concerns. The PostgreSQL schema should be finalized after the multi-tenant model is known, so tenant columns and tenant-aware uniqueness are designed once.

## Scope

Reviewed files and surfaces:

- `prisma/schema.prisma`
- `src/common/database/**`
- `src/common/request/pipes/request.is-valid-object-id.pipe.ts`
- `src/modules/**/repositories/*.repository.ts`
- services and utilities that consume embedded data or generated Prisma types
- DTO/doc constants that expose MongoDB ObjectId examples
- `docker-compose.yml`
- `src/migration/data/**`
- `src/migration/seeds/**`

The repository pattern remains the architectural boundary:

```text
Controller -> Service -> Repository -> DatabaseService
```

The migration keeps Prisma access inside repositories. Service changes are driven by changed returned shapes and business rules, not by direct database access.

## Executive Summary

The migration is not a provider-only schema change. The following model groups need rework before PostgreSQL is a good fit:

| Area | Current MongoDB shape | PostgreSQL target |
|---|---|---|
| Identifiers and audit ids | `String @db.ObjectId`, `@map("_id")` | `String @db.Uuid`, UUID defaults, no Mongo `_id` mapping |
| Embedded policy acceptance state | `User.termPolicy UserTermPolicy` plus `TermPolicyUserAcceptance` history | one relational acceptance/status model per user and policy type/version |
| Role abilities | `Role.abilities RoleAbility[]` with `action String[]` | normalized `RoleAbility` and `RoleAbilityAction`, or one row per role/subject/action |
| Country phone codes | `Country.phoneCode String[]` | `Country.phoneCodes String[]` |
| User photo | `User.photo UserPhoto?` | `UserPhoto` one-to-one table, or `Json` if deliberately opaque |
| Term policy contents | `TermPolicy.contents TermPolicyContent[]` | `TermPolicyContent` child table with unique `(termPolicyId, language)` |
| User agent and geolocation | embedded composite values on `Session` and `ActivityLog` | flattened columns or `Json` snapshots |
| Feature targeting | `FeatureFlag.targetUserIds String[] @db.ObjectId` | `FeatureFlagUser` join table |
| Two-factor backup codes | `TwoFactor.backupCodes String[]` | `TwoFactorBackupCode` child table |
| Notification delivery failures | `NotificationDelivery.failureTokens String[]` | `NotificationDeliveryFailure` child table, or `Json` only for raw provider snapshots |
| Health ping | Mongo `$runCommandRaw({ ping: 1 })` | PostgreSQL-compatible query, likely `$queryRaw` in the health indicator only |
| Local database runtime | MongoDB replica-set container and bootstrap container | PostgreSQL container, health check, volume, and service dependency |

## Provider-Level Incompatibilities

### Datasource

Current:

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

Target:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The environment contract changes from a MongoDB replica set URI to a PostgreSQL URI. Docker and installation docs drift because the current local infrastructure assumes MongoDB 8 with replica-set transactions.

### ObjectId Native Types

Every persisted id and foreign key currently uses MongoDB native ObjectId:

- Primary keys: `@default(auto()) @map("_id") @db.ObjectId`
- Foreign keys and audit actors: `String @db.ObjectId` or `String? @db.ObjectId`

Affected schema lines include all models from `ApiKey` through `NotificationUserSetting`, plus `createdBy`, `updatedBy`, `deletedBy`, `revokedById`, and relation foreign keys.

Target pattern:

```prisma
id String @id @default(dbgenerated("uuidv7()")) @db.Uuid
userId String @db.Uuid
createdBy String? @db.Uuid
updatedBy String? @db.Uuid
deletedBy String? @db.Uuid
```

Do not use `gen_random_uuid()` for new primary keys. It generates UUIDv4, which is random and less index-local than UUIDv7. Native PostgreSQL `uuidv7()` keeps id generation database-side, works for Prisma and non-Prisma insert paths, and matches the PostgreSQL 18.6 target.

### Collection Mapping

The schema currently maps Prisma models to PascalCase collection names, for example `@@map("Users")`. In the PostgreSQL version, the Prisma schema should follow Prisma conventions first: singular `PascalCase` model names and `camelCase` field names.

If the physical PostgreSQL tables and columns use `snake_case`, express that with `@@map("users")`, `@@map("api_keys")`, and field-level `@map("created_at")`. The Prisma API should stay ergonomic even when the underlying database naming differs.

## Model Rework Inventory

### ApiKey

Current issues:

- `id`, `createdBy`, and `updatedBy` use `ObjectId`.
- `key` and `hash` are globally unique, which is portable.
- No soft delete exists; `delete` currently hard-deletes API keys.

Target design:

- Convert identifiers and audit actor ids to UUID.
- Keep unique `key` and `hash`.
- Consider adding soft-delete columns if deleted API keys are operational audit records. If hard delete remains intentional, the current repository behavior stays aligned.
- Use lower snake case table and column mappings.

Affected code:

- `src/modules/api-key/repositories/api-key.repository.ts`
- `src/modules/api-key/controllers/api-key.admin.controller.ts`
- `src/modules/api-key/constants/api-key.doc.constant.ts`
- `src/modules/api-key/dtos/response/*.ts`

Repository/service refactor:

- Replace route validation from `RequestIsValidObjectIdPipe` to a UUID id pipe.
- Update DTO examples from `faker.database.mongodbObjectId()` to UUID examples.

### Role, RoleAbility

Current issues:

- `Role.abilities RoleAbility[]` is a MongoDB composite array.
- `RoleAbility.action String[]` is a nested scalar list inside a composite type.
- PostgreSQL cannot use Prisma composite `type` blocks.
- Abilities are authorization facts, not opaque metadata. They benefit from constraints and queryability.

Target design:

Option A, preferred relational shape for the current route-level RBAC contract:

```prisma
model Role {
  id          String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  name        String @unique
  description String?
  type        EnumRoleType @default(user)

  abilities RoleAbility[]
  users     User[]
}

model RoleAbility {
  id      String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  roleId  String @db.Uuid
  subject String
  action  String

  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, subject, action])
  @@index([subject, action])
}
```

Option B:

- `RoleAbility` with `subject`
- `RoleAbilityAction` child rows

Option A is simpler and makes permission lookup, uniqueness, and seeding straightforward. It also maps cleanly to CASL's rule shape when the application only checks `ability.can(action, subject)` at the route boundary.

If the PostgreSQL migration adopts `@casl/prisma` for row-level authorization, extend `RoleAbility` deliberately instead of only porting the Mongo-era shape:

- Replace `createMongoAbility` with `createPrismaAbility`.
- Type the app ability with CASL Prisma `Subjects` and `PrismaQuery`.
- Store optional Prisma `WhereInput` conditions as JSON only if the product needs row-level permissions.
- Use `accessibleBy(ability).ofType(ModelName)` inside repositories and combine it with business filters through `AND`.

Do not add condition JSON preemptively. The current policy module checks coarse route permissions only, so unconditional rows `(roleId, subject, action)` are the best migration target. Add `@casl/prisma` when repositories need database-filtered access, not just because the database moved to PostgreSQL.

Affected code:

- `src/modules/role/repositories/role.repository.ts`
- `src/modules/role/services/role.service.ts`
- `src/modules/role/dtos/role.ability*.ts`
- `src/modules/policy/factories/policy.factory.ts`
- role seed data under `src/migration/data` and `src/migration/seeds`

Repository/service refactor:

- `RoleRepository.create` and `update` stop writing `abilities` as `toPlainArray`.
- Role reads include `abilities` relation and map rows back to the API response shape if the public contract still exposes grouped actions.
- Updates replace the role ability set inside a transaction: delete removed rows, create new rows, and keep role metadata update atomic.
- Policy factory consumes relational ability rows instead of embedded composite objects.

### Country

Current issues:

- `Country.phoneCode String[]` uses a singular field name for multiple values.
- Phone codes are referenced by user mobile numbers as a free-text snapshot.

Target design:

```prisma
model Country {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  name       String
  alpha2Code String @unique
  alpha3Code String @unique
  continent  String
  timezone   String

  phoneCodes String[]
}
```

Affected code:

- `src/modules/country/repositories/country.repository.ts`
- `src/modules/country/services/country.service.ts`
- `src/modules/country/dtos/response/country.response.dto.ts`
- user mobile number validation in `src/modules/user/**`
- country seed data

Repository/service refactor:

- Country reads return `phoneCodes` directly.
- User mobile number validation checks the requested `phoneCode` against `Country.phoneCodes`.
- A relational `CountryPhoneCode` model can be added later if the application needs per-code metadata, independent phone-code queries, or a direct reference from `UserMobileNumber`.

### User

Current issues:

- `termPolicy UserTermPolicy` is a MongoDB composite type.
- `photo UserPhoto?` is a MongoDB composite type.
- `lastIPAddress` lacks PostgreSQL native `inet` typing.
- `passwordAttempt Int?` should likely default to `0` instead of being nullable.
- `@@index([id, deletedAt])` is redundant because `id` is already the primary key.
- Unique `email` and `username` block reuse after soft delete because PostgreSQL unique constraints include soft-deleted rows unless the design uses partial indexes.

Target design:

- Convert ids and audit actors to UUID.
- Replace `termPolicy` with relational current state.
- Replace `photo` with a `UserPhoto` one-to-one table, or with `Json` if the value is deliberately opaque and never queried.
- Use `lastIPAddress String? @db.Inet`.
- Set `passwordAttempt Int @default(0)` if null has no distinct meaning.
- Replace redundant indexes with workload-specific ones.
- Decide whether `email` and `username` are globally unique forever or only unique among non-deleted users. If only active/non-deleted uniqueness is desired, model it with Prisma partial indexes after upgrading to Prisma v7.4+ and enabling the `partialIndexes` preview feature.

Suggested relational term-policy current state:

```prisma
model UserTermPolicyStatus {
  id               String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  userId           String @db.Uuid
  type             EnumTermPolicyType
  latestPolicyId   String? @db.Uuid
  isAccepted       Boolean @default(false)
  acceptedPolicyId String? @db.Uuid
  acceptedAt       DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
  @@index([type, isAccepted])
}
```

Alternative:

- Drop current status and derive acceptance from `TermPolicyUserAcceptance` joined to latest published policies.
- This is cleanest from a data-integrity perspective but can make guards more query-heavy. A materialized current-status table keeps guard checks cheap and still relational.
- Flatten the four acceptance booleans directly onto `User`, as suggested in issue `#644`. This is easy to query, but it keeps current policy state tied to a fixed enum set and still duplicates acceptance history. It is acceptable only if policy types are intentionally static and the project values the simplest guard read over relational policy-state integrity.

Affected code:

- `src/modules/user/repositories/user.repository.ts`
- `src/modules/user/services/user.service.ts`
- `src/modules/user/dtos/user.term-policy.dto.ts`
- `src/modules/user/dtos/user.dto.ts`
- `src/modules/user/dtos/response/*.ts`
- `src/modules/term-policy/guards/term-policy.guard.ts`
- `src/modules/term-policy/services/term-policy.service.ts`
- `src/modules/auth/interfaces/auth.interface.ts`

Repository/service refactor:

- User creation no longer writes an embedded `termPolicy` object. It creates `UserTermPolicyStatus` rows for each policy type and `TermPolicyUserAcceptance` rows for preaccepted mandatory policies in the same transaction.
- Term policy guard reads a relation or calls `TermPolicyRepository` to evaluate current acceptance.
- `TermPolicyRepository.publish` updates relational current-status rows instead of bulk-updating `user.termPolicy[type]`.
- User profile photo update writes/upserts `UserPhoto` instead of assigning a composite.

### UserMobileNumber

Current issues:

- Ids are MongoDB ObjectIds.
- `phoneCode` is stored as free text.
- Unique `(userId, countryId, phoneCode, number)` may not prevent duplicate normalized phone numbers across formatting variants.

Target design:

- Convert ids to UUID.
- Consider `countryPhoneCodeId` if country phone codes become a child table.
- Store a normalized E.164 value and use a unique index on it. If multiple users may share a number, keep uniqueness per user; if not, enforce global uniqueness on normalized number.

Affected code:

- `src/modules/user/repositories/user.repository.ts`
- `src/modules/user/services/user.service.ts`
- `src/modules/user/dtos/user.mobile-number.dto.ts`
- mobile number request DTOs and validation logic

Repository/service refactor:

- Existence checks query normalized fields.
- Verification links continue through the relation, with UUID route validation.

### Verification and ForgotPassword

Current issues:

- Ids and `userId` fields use ObjectId.
- Token lookup indexes are portable but may be insufficient for expiration cleanup.
- `isUsed` duplicates state derivable from `verifiedAt` or `resetAt`.

Target design:

- Convert ids to UUID.
- Keep `reference` unique.
- Keep the PostgreSQL migration scoped to UUID and relational-provider changes.
- Move the `usedAt` cleanup into the post-migration improvement backlog. The better final design is a shared consumed-token shape where `usedAt` replaces duplicate state and `Verification.verifiedAt` / `ForgotPassword.resetAt` are removed.
- Add indexes matching active-token lookup, for example `(userId, type, isUsed, expiredAt)` for verifications and `(userId, isUsed, expiredAt)` for forgot password.

Affected code:

- `src/modules/user/repositories/user.repository.ts`
- `src/modules/user/services/user.service.ts`
- auth/token utility code

Repository/service refactor:

- Mostly generated type and UUID validation changes.
- Any active-token invalidation remains in repository transactions.

### PasswordHistory

Current issues:

- Ids and `userId` use ObjectId.
- Password history stores only current expiration and type, which is portable.

Target design:

- Convert ids to UUID.
- Keep index `(userId, expiredAt DESC)`.
- Consider unique or retention policy outside the schema if history volume becomes large.

Affected code:

- `src/modules/password-history/repositories/password-history.repository.ts`
- `src/modules/password-history/controllers/*.controller.ts`
- `src/modules/password-history/dtos/response/*.ts`

Repository/service refactor:

- UUID validation and generated types only.

### ActivityLog

Current issues:

- `userAgent UserAgent` and `geoLocation GeoLocation?` are MongoDB composite types.
- `metadata Json?` is portable to PostgreSQL `jsonb`.
- `ipAddress` is a plain string instead of PostgreSQL `inet`.

Target design:

Option A, preferred for append-only audit snapshots:

```prisma
model ActivityLog {
  id          String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  userId      String @db.Uuid
  action      EnumActivityLogAction
  ipAddress   String? @db.Inet
  userAgent   Json
  geoLocation Json?
  metadata    Json?
}
```

Option B:

- Flatten user-agent and geolocation into columns when operational queries depend on browser, OS, country, region, or city.

For audit logs, JSON snapshots are acceptable because the value is historical request context and not a domain entity.

Affected code:

- `src/modules/activity-log/repositories/activity-log.repository.ts`
- `src/modules/activity-log/services/activity-log.service.ts`
- `src/modules/activity-log/dtos/response/activity-log.response.dto.ts`
- every repository creating activity logs through nested writes

Repository/service refactor:

- `DatabaseUtil.toPlainObject` remains useful as a JSON cast if `userAgent` and `geoLocation` become `Json`.
- If flattened columns are chosen, every nested `activityLogs.create` call maps request log fields to the new columns.

### Session

Current issues:

- `userAgent UserAgent` and `geoLocation GeoLocation?` are MongoDB composite types.
- `ipAddress` is a plain string.
- `isRevoked` duplicates `revokedAt IS NOT NULL`.
- `@@unique([userId, jti])` allows the same JWT id across users; that may be intentional but JWT `jti` is usually globally unique.

Target design:

- Convert ids to UUID.
- Use `ipAddress String? @db.Inet`.
- Store `userAgent` and `geoLocation` as JSON snapshots or flattened columns.
- Prefer `revokedAt` as source of truth. A boolean `isRevoked` can remain if query clarity is valued, but PostgreSQL can index `revokedAt IS NULL` directly with a partial index.
- Consider `@@unique([jti])` if tokens are globally unique.
- Add the one-active-session invariant through Prisma partial-index support after upgrading Prisma:

```prisma
@@unique([deviceOwnershipId], where: { revokedAt: null })
```

Affected code:

- `src/modules/session/repositories/session.repository.ts`
- `src/modules/session/services/session.service.ts`
- `src/modules/auth/utils/auth.util.ts`
- user login/refresh/logout repository methods

Repository/service refactor:

- Active session queries switch from `isRevoked: false` to `revokedAt: null` if the boolean is removed.
- Session creation maps request log values to JSON or flattened columns.
- Revoke operations update `revokedAt` and `revokedById`; the boolean assignment disappears if not retained.

### Device and DeviceOwnership

Current issues:

- Ids use ObjectId.
- `Device.notificationToken` is on the physical device, but notification tokens can rotate per app installation and user context.
- `DeviceOwnership.isRevoked` duplicates `revokedAt`.
- There is no uniqueness rule preventing multiple active ownership rows for the same `(deviceId, userId)`.

Target design:

- Convert ids to UUID.
- Use `revokedAt` as source of truth where possible.
- Add a PostgreSQL partial unique index for one active ownership per `(deviceId, userId)` through Prisma partial-index support after upgrading Prisma:

```prisma
@@unique([deviceId, userId], where: { revokedAt: null })
```

- Consider moving push token fields to `DeviceOwnership` if tokens are user-installation scoped.

Affected code:

- `src/modules/device/repositories/device.ownership.repository.ts`
- `src/modules/device/services/device.service.ts`
- `src/modules/auth/utils/auth.util.ts`
- notification push token cleanup code

Repository/service refactor:

- Active ownership queries switch to `revokedAt: null` if `isRevoked` is removed.
- Device refresh and cleanup logic changes if notification token ownership moves from `Device` to `DeviceOwnership`.

### TwoFactor and Backup Codes

Current issues:

- `backupCodes String[]` is technically supported by PostgreSQL, but backup codes are security artifacts with lifecycle. Arrays make per-code use, per-code audit, uniqueness, and cleanup harder.
- Service logic depends on `twoFactor.backupCodes.length` and array replacement.

Target design:

```prisma
model TwoFactor {
  id            String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  userId        String @unique @db.Uuid
  secret        String?
  iv            String?
  enabled       Boolean @default(false)
  requiredSetup Boolean @default(false)
  confirmedAt   DateTime?
  lastUsedAt    DateTime?
  attempt       Int @default(0)

  backupCodes TwoFactorBackupCode[]
}

model TwoFactorBackupCode {
  id          String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  twoFactorId String @db.Uuid
  codeHash    String
  usedAt      DateTime?
  createdAt   DateTime @default(now())

  twoFactor TwoFactor @relation(fields: [twoFactorId], references: [id], onDelete: Cascade)

  @@unique([twoFactorId, codeHash])
  @@index([twoFactorId, usedAt])
}
```

Affected code:

- `src/modules/user/repositories/user.repository.ts`
- `src/modules/user/services/user.service.ts`
- `src/modules/auth/utils/auth.two-factor.util.ts`
- `src/modules/auth/validations/auth.two-factor-backup-code.validation.ts`
- two-factor DTOs and response mapping

Repository/service refactor:

- Verification reads unused backup-code rows.
- Successful backup-code login marks one row used or deletes it inside the same transaction.
- Regeneration deletes old unused rows and creates new hash rows.
- Response code count uses `_count` or a repository projection rather than array length.

### TermPolicy, TermPolicyContent, TermPolicyUserAcceptance

Current issues:

- `TermPolicy.contents TermPolicyContent[]` is a MongoDB composite array.
- Language uniqueness is enforced in service code, not by the database.
- `TermPolicyUserAcceptance` is relational history, but `User.termPolicy` duplicates current state.
- Publishing a policy bulk-updates an embedded boolean on every active user.

Target design:

```prisma
model TermPolicy {
  id          String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  type        EnumTermPolicyType
  version     Int @default(1)
  status      EnumTermPolicyStatus @default(draft)
  publishedAt DateTime?

  contents TermPolicyContent[]
  acceptances TermPolicyUserAcceptance[]

  @@unique([type, version])
  @@index([type, status, publishedAt(sort: Desc)])
}

model TermPolicyContent {
  id           String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  termPolicyId String @db.Uuid
  language     String
  bucket       String
  key          String
  cdnUrl       String?
  completedUrl String
  mime         String
  extension    String
  access       String
  size         Int

  termPolicy TermPolicy @relation(fields: [termPolicyId], references: [id], onDelete: Cascade)

  @@unique([termPolicyId, language])
}
```

Acceptance current state uses either `UserTermPolicyStatus` as described above or a derived query against latest published policies and acceptances.

Affected code:

- `src/modules/term-policy/repositories/term-policy.repository.ts`
- `src/modules/term-policy/services/term-policy.service.ts`
- `src/modules/term-policy/utils/term-policy.util.ts`
- `src/modules/term-policy/dtos/response/*.ts`
- `src/modules/term-policy/dtos/request/*.ts`
- `src/modules/term-policy/guards/term-policy.guard.ts`
- user creation/import flows
- term policy seed and template seed

Repository/service refactor:

- Content add/update/remove becomes child-table create/update/delete.
- `getContentByLanguage` can move from array search to repository lookup by `(termPolicyId, language)`.
- Publish updates policy status and current user policy status in a transaction.
- Service-level duplicate-language validation becomes a friendly precheck; database uniqueness becomes the final integrity guard.

### FeatureFlag and Target Users

Current issues:

- `targetUserIds String[] @db.ObjectId` is a MongoDB-flavored id array.
- Feature targeting references users without foreign keys.
- Service checks `featureFlag.targetUserIds.includes(user.userId)`, which assumes an array loaded on the feature flag row.

Target design:

```prisma
model FeatureFlag {
  id             String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  key            String @unique
  description    String
  isEnable       Boolean @default(true)
  rolloutPercent Int @default(100)
  metadata       Json?

  targetUsers FeatureFlagUser[]
}

model FeatureFlagUser {
  id            String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  featureFlagId String @db.Uuid
  userId        String @db.Uuid

  featureFlag FeatureFlag @relation(fields: [featureFlagId], references: [id], onDelete: Cascade)
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([featureFlagId, userId])
  @@index([userId])
}
```

Use `FeatureFlagUser` rather than `FeatureFlagTargetUser` for the join model. The relation field name `targetUsers` carries the targeting meaning, while the table/model name stays the conventional entity-pair name. If future targeting adds groups, segments, or organizations, introduce separate explicit models such as `FeatureFlagGroup` or `FeatureFlagSegment`.

Affected code:

- `src/modules/feature-flag/repositories/feature-flag.repository.ts`
- `src/modules/feature-flag/services/feature-flag.service.ts`
- `src/modules/feature-flag/utils/feature-flag.util.ts`
- `src/modules/feature-flag/dtos/request/feature-flag.update-status.request.ts`
- `src/modules/feature-flag/dtos/response/feature-flag.response.ts`
- feature flag seed data

Repository/service refactor:

- `findOneByKey` includes target user ids or exposes a repository method `existsTargetUser(key, userId)`.
- `updateStatus` replaces the target-user relation set inside a transaction.
- The guard service no longer checks an array unless the utility maps relation rows into a compatibility-free domain shape.

### Notification and NotificationDelivery

Current issues:

- `Notification.metadata Json?` is portable and reasonable for template payload metadata.
- `NotificationDelivery.failureTokens String[]` is a PostgreSQL scalar array, but failure tokens are event details tied to a send attempt.
- Delivery only stores one row per notification/channel. Repeated send attempts overwrite `sentAt`, `processedAt`, and `failureTokens`.

Target design:

Minimal relational cleanup:

```prisma
model NotificationDeliveryFailure {
  id                     String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  notificationDeliveryId String @db.Uuid
  token                  String
  code                   String?
  message                String?
  createdAt              DateTime @default(now())

  delivery NotificationDelivery @relation(fields: [notificationDeliveryId], references: [id], onDelete: Cascade)

  @@index([notificationDeliveryId])
  @@index([token])
}
```

Use `NotificationDeliveryFailure` for the minimal child table. FCM returns a per-token response with an optional error, so the domain event is the delivery failure, not the token itself. Store the token plus provider error code/message for audit and cleanup decisions.

Better delivery history:

- `NotificationDelivery` represents a planned channel.
- `NotificationDeliveryAttempt` represents each processing/send attempt with provider response metadata.
- Failures belong to an attempt. In that design, name the child model `NotificationDeliveryAttemptFailure`.

That attempt-history expansion is out of scope for the migration. Phase 1 should only preserve the current capability by replacing `failureTokens` with `NotificationDeliveryFailure` rows.

Affected code:

- `src/modules/notification/repositories/notification.repository.ts`
- `src/modules/notification/services/notification.processor.service.ts`
- `src/modules/notification/services/notification.push.processor.service.ts`
- `src/modules/notification/utils/notification.push.util.ts`
- notification DTOs/interfaces

Repository/service refactor:

- `updateSentAt` creates failure-token rows or attempt rows instead of overwriting an array.
- Response mapping decides whether to expose aggregate failure-token values or attempt history.
- Existing nested delivery writes remain valid relational writes; only failure-token persistence changes.

### NotificationUserSetting

Current issues:

- Ids use ObjectId.
- The unique `(userId, channel, type)` is portable and well-suited to PostgreSQL.

Target design:

- Convert ids to UUID.
- Keep the unique key and `(userId, isActive)` index.

Affected code:

- `src/modules/notification/repositories/notification.repository.ts`
- notification user-setting DTOs and service methods

Repository/service refactor:

- Mostly generated type and UUID validation changes.

## Cross-Cutting Code Refactors

### Database Module

Affected files:

- `src/common/database/factories/database.client.factory.ts`
- `src/common/database/services/database.service.ts`
- `src/common/database/utils/database.extension.util.ts`
- `src/common/database/utils/database.util.ts`
- `src/common/database/dtos/response/*.ts`

Changes:

- `DatabaseUtil.checkIdIsValid` becomes UUID validation.
- `DatabaseUtil.createId` returns UUIDs or disappears where database defaults can generate ids.
- `toPlainObject` and `toPlainArray` remain only for JSON fields. Uses that existed only to coerce composite values disappear when those values become relation rows.
- Audit stamping still works after field names remain `createdBy`, `updatedBy`, and `deletedBy`. Their native types change to UUID.
- `DatabaseClientFactory` can keep Prisma event logging, but any Mongo-specific assumptions in docs/comments change.

### Docker Compose

Affected file:

- `docker-compose.yml`

Current runtime:

- `apis` waits for `mongo`.
- `mongo` runs `mongo:latest` with replica-set flags and the `mongo_data` volume.
- `mongo-bootstrap` initializes the single-node replica set through `mongosh`.

Target runtime:

- `apis` waits for a `postgres` service health check instead of `mongo`.
- `postgres` uses the agreed PostgreSQL major version, exposes `5432`, persists data in a `postgres_data` volume, and receives database name, user, and password from environment variables aligned with `.env.example`.
- The health check uses `pg_isready` for the configured user and database.
- The `mongo` and `mongo-bootstrap` services disappear from the default compose file.
- The `mongo_data` volume disappears from the default compose file.
- `DATABASE_URL` examples use the PostgreSQL connection format, including the Docker service hostname for container-to-container runtime.

### Request ID Validation

Affected file:

- `src/common/request/pipes/request.is-valid-object-id.pipe.ts`

Current code validates MongoDB ObjectId with `class-validator` `isMongoId`.

Target:

- Replace with `RequestIsValidUuidPipe` or a generic `RequestIsValidIdPipe`.
- Replace `RequestIsMongoIdException` and language key `request.isMongoId` with UUID-oriented naming/message.
- Update every controller importing `RequestIsValidObjectIdPipe`.

Affected controller modules:

- api key
- role
- user
- session
- device
- term policy
- password history
- activity log
- notification

### Generated Type Shape

Generated Prisma types change significantly when composite fields become relations:

- `Role.abilities` becomes relation rows.
- `TermPolicy.contents` becomes relation rows.
- `User.termPolicy` disappears.
- `User.photo` becomes relation or JSON.
- `TwoFactor.backupCodes` becomes relation rows.
- `FeatureFlag.targetUserIds` disappears.
- `ActivityLog.userAgent`, `ActivityLog.geoLocation`, `Session.userAgent`, and `Session.geoLocation` become `Json` or flattened scalar fields.

Affected services and utilities:

- `src/modules/term-policy/services/term-policy.service.ts`
- `src/modules/term-policy/utils/term-policy.util.ts`
- `src/modules/feature-flag/services/feature-flag.service.ts`
- `src/modules/feature-flag/utils/feature-flag.util.ts`
- `src/modules/auth/utils/auth.two-factor.util.ts`
- `src/modules/auth/utils/auth.util.ts`
- `src/modules/policy/factories/policy.factory.ts`
- response DTO mappers in user, role, term policy, feature flag, notification, session, activity log, device

### Health Indicator

Affected file:

- `src/modules/health/indicators/health.database.indicator.ts`

Current code:

```ts
await this.databaseService.client.$runCommandRaw({ ping: 1 });
```

Target:

```ts
await this.databaseService.client.$queryRaw`SELECT 1`;
```

This is a sanctioned health-indicator exception to the feature-repository raw-query rule. Feature repositories still avoid raw SQL.

### Migration and Seed Commands

Affected files:

- `src/migration/data/**`
- `src/migration/seeds/**`
- package scripts for migration commands
- `docker-compose.yml`
- database/environment documentation

Changes:

- MongoDB `db push` workflow is replaced by Prisma Migrate for PostgreSQL.
- Docker Compose swaps the MongoDB replica-set service pair for a PostgreSQL service and removes the default MongoDB volume.
- Seed order remains conceptually similar, but child tables add more rows:
  - country phone codes after countries
  - role abilities after roles
  - term policy contents after policies
  - user term policy statuses after users and term policies
  - feature flag target users after users and feature flags
  - two-factor backup codes when generated by runtime flows
- Any seed-generated ids use UUIDs or let PostgreSQL generate ids and connect via unique natural keys.
- Seed inputs under `src/migration/data/**` stop carrying ObjectId-shaped identifiers and embedded child arrays where the target schema represents them as child rows.
- Seed classes under `src/migration/seeds/**` write relational child rows with Prisma nested writes or repository-local transactions, depending on the final schema shape.
- Seed removal order reverses the new foreign-key graph so child rows are removed before parent rows.

## PostgreSQL Best-Practice Design Issues

### Embedded Domain Entities

Embedded MongoDB composites are the main mismatch:

- `RoleAbility`
- `TermPolicyContent`
- `UserTermPolicy`
- `UserPhoto`
- `UserAgent`
- `GeoLocation`

PostgreSQL can store JSON, but JSON is a better fit for snapshots or opaque metadata. Role permissions, policy content, user acceptance state, and feature targeting are domain entities with integrity rules. They belong in relational tables.

### Array Fields as Relationships

The following arrays are not good PostgreSQL relationship models and are normalized in the initial migration:

- `FeatureFlag.targetUserIds`
- `TwoFactor.backupCodes`
- `NotificationDelivery.failureTokens`
- `RoleAbility.action`
- `TermPolicy.contents`

PostgreSQL supports arrays, but arrays do not create foreign keys, per-item timestamps, per-item uniqueness, or query plans as clean as child tables.

`Country.phoneCodes` is intentionally kept as a scalar list for this migration because the application only validates a requested mobile-number `phoneCode` against the country-level options. A relational phone-code table can be introduced later if the app needs independent code management or stronger mobile-number references.

### Boolean State Duplicating Timestamp State

These pairs duplicate state:

- `Session.isRevoked` and `Session.revokedAt`
- `DeviceOwnership.isRevoked` and `DeviceOwnership.revokedAt`
- `Verification.isUsed` and `Verification.verifiedAt`
- `ForgotPassword.isUsed` and `ForgotPassword.resetAt`

This is better treated as follow-up cleanup than as a Phase 1 migration requirement. The PostgreSQL migration should preserve existing behavior first, then a later spec can decide whether `revokedAt`, `verifiedAt`, and `resetAt` become the only source of truth.

For `Session` and `DeviceOwnership`, that decision fits naturally with the Prisma partial-index work tracked in [prisma-v7-upgrade-spec.md](/Users/dantoniolc/ghq/github.com/andrechristikan/ack-nestjs-boilerplate/docs/pr/prisma-v7-upgrade-spec.md). For `Verification` and `ForgotPassword`, the lifecycle-field cleanup remains follow-up work in `postgresql-post-migration-improvements.md`.

### Soft Delete and Uniqueness

`User.email` and `User.username` are globally unique today. With soft delete, that means deleted users keep reserving those values forever. PostgreSQL supports partial unique indexes for "unique among active rows" if reuse after soft delete is desired.

That is not a Phase 1 migration concern. The initial PostgreSQL migration should keep the current uniqueness semantics unless the product explicitly decides otherwise. If active-row uniqueness is wanted later, model it in Prisma schema through the Prisma v7 follow-up tracked in [prisma-v7-upgrade-spec.md](/Users/dantoniolc/ghq/github.com/andrechristikan/ack-nestjs-boilerplate/docs/pr/prisma-v7-upgrade-spec.md), not with hand-written migration SQL.

### Native Types

PostgreSQL-specific native types improve correctness:

- `@db.Uuid` for ids and audit actor ids
- `@db.Inet` for IP address fields
- `@db.VarChar(n)` or `@db.Text` decisions for bounded/unbounded text
- `Json` for metadata snapshots, mapped to `jsonb`

### Table and Column Naming

Prisma schema naming should follow Prisma conventions rather than database conventions. Use singular `PascalCase` for model names and `camelCase` for field names so the generated Prisma Client stays idiomatic.

Treat database table and column names as a mapping concern. If PostgreSQL tables/columns are created as `snake_case`, keep the Prisma schema readable with `@@map` and `@map` instead of mirroring database names directly in model and field identifiers.

## Suggested Migration Phases

### Phase 1: Schema Redesign

Deliverables:

- PostgreSQL datasource.
- UUID ids and foreign keys across all models.
- Prisma-conventional schema naming: singular `PascalCase` models and `camelCase` fields.
- `@map` and `@@map` only where the physical PostgreSQL naming intentionally differs from the Prisma schema naming.
- Replacement models:
  - `RoleAbility`
  - `UserPhoto`
  - `TermPolicyContent`
  - `UserTermPolicyStatus`
  - `FeatureFlagUser`
  - `TwoFactorBackupCode`
  - `NotificationDeliveryFailure`
- JSON or flattened replacement for `UserAgent` and `GeoLocation`.
- Keep current uniqueness and lifecycle semantics unless a separate follow-up spec changes them.
- Tenant ownership columns and tenant-aware uniqueness once the multi-tenant branch is landed and its data model is final.

### Phase 2: Common Database and Request Infrastructure

Deliverables:

- UUID-based database id utility.
- UUID request pipe and exception.
- PostgreSQL health indicator.
- Docker Compose PostgreSQL service, health check, port, volume, and `apis.depends_on` wiring.
- Removed default MongoDB and MongoDB bootstrap services from Docker Compose.
- Updated database docs and environment examples.
- Removed MongoDB-specific ObjectId examples from DTOs and doc constants.
- Optional MongoDB setup documentation moved out of the default path if the project still wants MongoDB documented as an alternative.

### Phase 3: Repository Refactor

Deliverables by module:

- Role repositories write relational ability rows.
- Country repositories include phone-code rows.
- User repositories create acceptance status rows, photo rows, backup-code rows, and JSON/flattened request-log fields.
- Term policy repositories write content rows and update relational acceptance status.
- Feature flag repositories replace target-user relations transactionally.
- Notification repositories write failure rows instead of `failureTokens` arrays.
- Session/device repositories align revoke logic with the final timestamp/boolean decision.

### Phase 4: Service and Mapper Refactor

Deliverables:

- Term policy guard evaluates relational current status or derived latest acceptance.
- Feature flag guard checks relational target users.
- Policy factory builds CASL abilities from relation rows.
- Two-factor utility validates backup codes against rows, not arrays.
- Response DTO mappers expose the intended API shapes from relational data.

### Phase 5: Seeds and Data Transfer

Deliverables:

- PostgreSQL seed data with UUID strategy.
- Updated seed data files in `src/migration/data/**` for relational PostgreSQL shapes.
- Updated seed classes in `src/migration/seeds/**` for child-table insertion and foreign-key-safe removal order.
- Transform script or one-off ETL plan from MongoDB exports:
  - map old ObjectIds to new UUIDs
  - create child rows from composite arrays
  - preserve timestamps and audit actor mappings where actor ids exist
  - derive current policy statuses from `User.termPolicy` plus acceptance history
  - create failure-token rows from delivery arrays
- Validation queries comparing counts and critical relationships.

### Phase 6: Test and Runtime Verification

Deliverables:

- Targeted unit tests for changed services, guards, utilities, and mappers.
- Repository integration tests if the project adds an integration-test layer for PostgreSQL behavior.
- `pnpm typecheck`
- `pnpm lint`
- `pnpm spell`
- Boot verification after wiring changes.

## Acceptance Checklist

- Prisma schema uses `provider = "postgresql"`.
- No `@db.ObjectId`, `@map("_id")`, or MongoDB composite `type` blocks remain.
- Route parameter validation accepts UUIDs and rejects non-UUIDs.
- DTO and Swagger examples no longer generate MongoDB ObjectIds.
- Database health uses a PostgreSQL-compatible query.
- Docker Compose starts PostgreSQL as the default database dependency for `apis`.
- Docker Compose no longer contains default `mongo`, `mongo-bootstrap`, or `mongo_data` entries.
- Role abilities have relational integrity and uniqueness.
- Term policy contents have a database-level unique `(termPolicyId, language)` constraint.
- User term-policy current state is relational or derived, not embedded on `User`.
- Feature flag target users are relational and foreign-keyed.
- Two-factor backup codes support per-code lifecycle.
- Notification delivery failures are represented as child rows.
- Soft-delete uniqueness follow-up is tracked separately in `prisma-v7-upgrade-spec.md`.
- Seed data runs against PostgreSQL without MongoDB-specific id assumptions.
- Seed removal order is foreign-key safe for PostgreSQL.
