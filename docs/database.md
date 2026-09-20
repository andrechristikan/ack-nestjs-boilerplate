# Database Documentation

The Database Module lives in `src/common/database`.

## Overview

Prisma + PostgreSQL, transactions, seeds, and the Database Module.

## Related Documents

- [Installation Documentation][ref-doc-installation] - For complete project setup and dependencies
- [Environment Documentation][ref-doc-environment] - For database connection and environment variables
- [Configuration Documentation][ref-doc-configuration] - For understanding the config module structure

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Migration](#migration)
- [Generate Database Client](#generate-database-client)
- [Seeding](#seeding)
	- [Database Seeds](#database-seeds)
	- [Template Seeds](#template-seeds)
	- [AWS S3 Configuration Seed](#aws-s3-configuration-seed)
- [Initial Seeded Data](#initial-seeded-data)
	- [API Keys](#api-keys)
	- [Roles](#roles)
	- [Users](#users)
	- [Feature Flags](#feature-flags)
	- [Term Policies](#term-policies)
- [Relational and JSON Data Shapes](#relational-and-json-data-shapes)
	- [GeoLocation](#geolocation)
	- [UserAgent](#useragent)
	- [User Term Policy Acceptance](#user-term-policy-acceptance)
	- [UserPhoto](#userphoto)
	- [TermPolicyContent](#termpolicycontent)
- [Audit Fields and Soft Delete](#audit-fields-and-soft-delete)
	- [Client Access Surface](#client-access-surface)
	- [Automatic Actor Stamping](#automatic-actor-stamping)
	- [Soft Delete and Restore](#soft-delete-and-restore)
	- [Delete Behaviour of Foreign Keys](#delete-behaviour-of-foreign-keys)
- [Generated Unique Values](#generated-unique-values)
- [Docker](#docker)
- [Database Tools](#database-tools)
	- [Prisma ORM](#prisma-orm)
	- [Why Prisma for Repository Design Pattern?](#why-prisma-for-repository-design-pattern)
	- [Database provider](#database-provider)


## Prerequisites

> **💡 Tip:** Use the Docker setup from the installation guide for a ready-to-use PostgreSQL and Redis development stack.

**PostgreSQL 18.x** with the project database created and reachable through `DATABASE_URL`.

## Migration

ACK NestJS Boilerplate uses Prisma Migrate for PostgreSQL schema changes. Migration files live under `prisma/migrations/*` and are applied through the project database scripts.

For local development, use:

```bash
pnpm db:migrate
```

For details, see the official Prisma documentation: [Prisma Migrate][ref-prisma-migrate]

## Generate Database Client

Prisma uses a generated client for type-safe queries. A schema edit in `prisma/schema.prisma` takes `pnpm db:generate` to write the client into `src/generated/prisma-client`.

**When to Generate Prisma client?**
- After any change to your Prisma schema (e.g., adding, removing, or updating models/fields).
- After pulling schema changes from version control.

**How to Generate Prisma Client:**
```bash
pnpm db:generate
```

This command reads `prisma/schema.prisma` and writes the client into `src/generated/prisma-client` (gitignored). The `prisma-client` generator emits ESM with `.js` import extensions; application code imports it from `@generated/prisma-client/client`, and ESLint rejects an import from its `internal/` folder. `pnpm generate` runs this command together with `pnpm generate:package`.


## Seeding

Seeding in ACK NestJS Boilerplate is handled using nest-commander. All seed commands are implemented in `src/migration/seeds/*`.

### Database Seeds

**Seed Data Location:**
- All seed data is stored in `src/migration/data/*`.

**How to Run All Seeds:**
- `pnpm migration:seed` — runs all seed commands to populate initial data.
- `pnpm migration:remove` — removes all seeded data from the database.
- `pnpm migration:fresh` — resets the PostgreSQL schema with Prisma Migrate, then immediately re-seeds all data. Useful during development when you need a clean slate.

**The order lives in the `package.json` scripts:**

- `migration:seed` runs `apiKey` → `country` → `featureFlag` → `role` → `policy` → `termPolicy` → `user` → `workspace`. A seed that references another's rows runs after it: `policy` needs `role`, `user` needs both `role` and `country`, and `workspace` needs the seeded users.
- `migration:remove` runs `workspace` → `user` → `apiKey` → `featureFlag` → `country` → `policy` → `role` → `termPolicy`, removing the referrer before anything it references.
- Neither script runs the template seeds or the AWS S3 configuration seed. Those are invoked on their own.
- Every seed is idempotent: re-running `migration:seed` against a database that already holds the rows is safe.

**Seed transactions.** A seed that writes several rows opens one `DatabaseService.withTransaction` in callback form, issues every statement on `tx` one after another, and passes `{ timeout }` read from `database.seedTransactionTimeoutInMs` (60 seconds). The same timeout applies to the transactions the `user` and `workspace` seeds open in `remove()`. Work that does not touch the database runs before the transaction: key and hash derivation in the `apiKey` seed, and ids, bcrypt password hashes, and verification tokens in the `user` seed. Every other `remove()` that deletes rows runs its delete on `client` with no transaction. The `template-email-notification` and `aws-s3-config` seeds write no database row.

**The seed actor.** `MigrationUserSuperAdminId` (`src/migration/data/migration.user.data.ts`) is a fixed UUID. The `user` seed creates the superadmin row with that `id`, and every seed that writes rows uses it as the actor:

- An upsert's `create` branch writes `createdBy` and `updatedBy` as `MigrationUserSuperAdminId`; its `update` branch writes `updatedBy`, plus `contents` in the term policy template seed. A re-run therefore sets `updatedBy` and moves `updatedAt` forward on every seeded row that has those columns, and leaves `createdBy` and `id` untouched.
- The `workspace` seed writes the same actor on each workspace and passes it to `WorkspaceMemberRepository.createInTx` for the owner membership, which stores it as both `createdBy` and `updatedBy`.
- `createdBy` does not mark a row as seeded. A row the superadmin later creates through the admin API carries the same id, so no `remove()` filters on it. The `workspace` seed's `remove()` finds its rows by the name `<username>'s Workspace` together with an owner membership of that user.

**How to Seed/Remove a Specific Module:**
Run the command:
   - Seed: `pnpm migration {module} --type seed`
   - Remove: `pnpm migration {module} --type remove`

**Available Types:**
- `seed` (add data)
- `remove` (delete data)

**Available Modules:**

- `apiKey`: Inserts default and system API keys for authentication and service access.
- `country`: Inserts country data (name, codes, phone codes, continent, timezone).
- `featureFlag`: Inserts feature flags to enable/disable features (e.g., login methods, sign up, change password).
- `role`: Inserts user roles (superadmin, admin, user).
- `policy`: Inserts the policy rows attached to each seeded role.
- `termPolicy`: Inserts term policy documents (cookies, marketing, privacy, terms of service) with version and content.
- `user`: Inserts initial user accounts (Super Admin, Admin, User) with country, role, and credentials.
- `workspace`: Inserts one default personal workspace per seeded user, with that user as owner member. Requires the `user` seed to have run first, and skips any user who already owns a workspace.


### Template Seeds

Template seeding uses the same script and commands as Database Seeds, but is specifically for template files like email and term policies.

**Available Types:**
- `seed` (add template data)
- `remove` (delete template data)

#### Email Templates

The email template seed imports the templates into AWS SES, checking each one first and importing only the ones SES does not already hold. It requires SES to be initialized and throws when it is not.

**How to Run Email Template Seeds:**
- Seed: `pnpm migration template-email-notification --type seed`
- Remove: `pnpm migration template-email-notification --type remove`

#### Term Policy Templates

The term policy template seed uploads each policy document to S3 and writes it onto the matching database record. It requires S3 to be initialized and throws when it is not.

**How to Run Term Policy Template Seeds:**
- Seed: `pnpm migration template-termPolicy --type seed`
- Remove: `pnpm migration template-termPolicy --type remove` *(no-op; term policy removal is intentionally skipped)*


### AWS S3 Configuration Seed

The migration script is a special seed command that configures AWS S3 bucket policies and settings for both public and private buckets. Unlike other seed commands, this migration doesn't populate database data but instead configures your AWS infrastructure.

**What It Does:**

The seed applies these S3 bucket settings, in this order:

1. **Block Public Access Configuration** - Controls public access restrictions
2. **Disable ACL Configuration** - Enforces bucket owner ownership controls
3. **Bucket Policy** - Sets read/write permissions based on bucket accessibility
4. **CORS Configuration** - Configures Cross-Origin Resource Sharing rules
5. **Lifecycle Configuration** - Automatically deletes incomplete multipart uploads

**Why Sequential Configuration Matters:**

The seed applies the steps in this order because AWS S3 policies depend on each other: the public access block is configured before the bucket policy.

**How to Run:**

```bash
# Configure both public and private buckets
pnpm migration aws-s3-config --type seed
```

**Important Notes:**

- This migration runs configurations for **both public and private buckets** simultaneously
- The `--type remove` option is intentionally skipped (no removal operation)
- Requires valid AWS credentials and appropriate IAM permissions
- Bucket names and ARNs must be properly configured in your environment variables

**Configuration Applied:**

For **Public Buckets**:
- Public read access (`s3:GetObject`) for all objects
- Full IAM user access for management operations
- CORS rules allowing GET/HEAD from any origin
- CORS rules allowing PUT/POST/DELETE from whitelisted origins

For **Private Buckets**:
- Blocks all public access
- CORS rules only allow whitelisted origins for all methods
- Full IAM user access required for all operations


## Initial Seeded Data

`pnpm migration:seed` creates the data below, which local development and testing run against.

### API Keys

> [!WARNING]
> These keys and their secret are published in this repository. They are seeded in `local` only.

Two API keys are created for authentication and service access. They are seeded in the `local` environment only; `development`, `staging`, and `production` seed no api key.

| Name | Type | Key | Secret | Usage |
|------|------|-----|--------|-------|
| Api Key Default | `default` | `local_fyFGb7ywyM37TqDY8nuhAmGW5` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For general API access |
| Api Key System | `system` | `local_UTDH0fuDMAbd1ZVnwnyrQJd8Q` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For system-level operations |

The seed data in `migration.api-key.data.ts` holds the bare random part; `ApiKeyCredentialUtil.createKey()` prepends the environment prefix before the row is upserted, so the key a client sends is the prefixed value above. The seed is an `upsert` keyed on the prefixed key, which is what makes re-running it safe.

**API Key Prefix Convention:**

All generated API keys automatically include an environment prefix to help identify which environment they belong to. The format is:

```
{environment}_{random_string}
```

**Examples:**
- `local_abc123xyz` - API key for local/development environment
- `development_def456uvw` - API key for development environment
- `staging_ghi789rst` - API key for staging environment
- `production_jkl012mno` - API key for production environment

This prefix is added from `APP_ENV` when a new API key is created, so a key from one env is obvious in another.

### Roles

Three user roles are created with different permission levels:

| Role | Type | Description | Seeded policies |
|------|------|-------------|-----------------|
| superadmin | `superAdmin` | Super Admin Role | None: `superAdmin` bypasses the policy check entirely |
| admin | `admin` | Admin Role | Every policy action on every policy subject |
| user | `user` | User Role | None |

**Admin role policies**: the `policy` seed writes one row per `EnumPolicySubject`, each carrying every member of `EnumPolicyAction` (`manage`, `read`, `create`, `update`, `delete`). It reads the roles by name first and aborts without writing when one is missing, and each row is an upsert on `(roleId, subject)`, so re-running it is safe.

### Users

> [!WARNING]
> These accounts use a password published in this repository, and the superadmin and admin accounts are seeded in every environment.

The seeded users differ per environment. This is controlled by `MigrationUserData` in `src/migration/data/migration.user.data.ts`:

| Environment | Seeded Users |
|---|---|
| `local` | superadmin + admin + user |
| `development` | superadmin + admin only |
| `staging` | superadmin + admin only |
| `production` | superadmin + admin only |

**User accounts:**

| Email | Username | Name | Role | Password | Country | Environments |
|-------|----------|------|------|----------|---------|-------------|
| superadmin@mail.com | superadmin | Super Admin | superadmin | `aaAA@123` | ID (Indonesia) | all |
| admin@mail.com | admin | Admin | admin | `aaAA@123` | ID (Indonesia) | all |
| user@mail.com | user | User | user | `aaAA@123` | ID (Indonesia) | `local` only |

The superadmin row carries the fixed id `MigrationUserSuperAdminId`; the other rows get an id drawn before the transaction. Every created user row, and its nested two-factor, notification-setting, password-history, verification, and term-policy acceptance rows, name the superadmin as `createdBy` (and as `updatedBy` where the model has the column).

Each created user also gets its activity rows in the same transaction:

| Row | Belongs to | `createdBy` | Metadata |
|---|---|---|---|
| `userCreated` | The superadmin | The superadmin | Empty |
| `userCreatedByAdmin` | The admin and the user | The superadmin | `actorUserId`, `timestamp` |
| `adminUserCreate`, one per admin or user row the run creates | The superadmin | The superadmin | `targetUserId`, `targetUsername`, `timestamp` |
| `userVerifiedEmail` | Each created user | The superadmin | Empty |
| `userAcceptTermPolicy`, one per accepted policy (terms of service, privacy) | Each created user | The user itself, as for every `user = payload` action | Empty |

A user whose email already exists is left as it is apart from `updatedBy`, and gets no new nested or activity row.

> [!WARNING]
> The `user` seed checks the superadmin email before writing. When that email already exists under an id other than `MigrationUserSuperAdminId`, the seed logs an error naming the email, the id found, and the id expected, and returns without writing anything. The bundled `migration:seed` script carries on with the next command. Realigning such a database means running `pnpm migration:remove`, then `pnpm migration:seed` (or `pnpm migration:fresh`). **Both paths are destructive:** the `user` seed's `remove()` deletes every user, session, activity log, and related row in the database, seeded or not, so neither belongs on an environment holding real data.

### Feature Flags

Six feature flags are created to control authentication, user, and workspace features:

| Key | Description | Enabled | Rollout | Metadata |
|-----|-------------|---------|---------|----------|
| `loginWithGoogle` | Enable login with Google | ✅ Yes | 100% | `signUpAllowed: true` |
| `loginWithApple` | Enable login with Apple | ✅ Yes | 100% | `signUpAllowed: true` |
| `loginWithCredential` | Enable login with Credential | ✅ Yes | 100% | - |
| `signUp` | Enable user sign up | ✅ Yes | 100% | - |
| `changePassword` | Enable change password feature | ✅ Yes | 100% | `forgotAllowed: true` |
| `workspace` | Enable the workspace and project router surface, including invitation and join request | ✅ Yes | 100% | `invitationAllowed: true`, `joinRequestAllowed: true` |

All features are enabled by default with 100% rollout for development convenience.

### Term Policies

Four term policy documents are created:

| Type | Version | Language | Description |
|------|---------|----------|-------------|
| `cookies` | 1 | EN | Cookie policy document |
| `marketing` | 1 | EN | Marketing terms document |
| `privacy` | 1 | EN | Privacy policy document |
| `termsOfService` | 1 | EN | Terms of Service document |

The `termPolicy` seed creates each record with an empty `contents` array and `status: published`. The document bodies are Handlebars templates in `src/modules/term-policy/templates/*.hbs`, one per type. They are linked by the term policy template seed, which uploads them to S3 and upserts the resulting `TermPolicyContent` entry (`language: en`) onto the version-1 record of each type.

For more details on how seeding works, see: [Template Seeds](#template-seeds)


## Relational and JSON Data Shapes

PostgreSQL uses relational child tables for repeatable domain data and JSON columns for request snapshots. IDs are UUIDv7 strings (`String @db.Uuid`) generated by the database through `uuidv7()`.

### GeoLocation

Represents the geographic location derived from a client's IP address using `geoip-lite`.

```prisma
model ActivityLog {
  geoLocation Json?
}

model Session {
  geoLocation Json?
}
```

| Field | Type | Description |
|---|---|---|
| `latitude` | `Float` | Latitude coordinate |
| `longitude` | `Float` | Longitude coordinate |
| `country` | `String` | ISO country code (e.g. `"ID"`) |
| `region` | `String` | Region/state code (e.g. `"JK"`) |
| `city` | `String` | City name (e.g. `"Jakarta"`) |

**Used in:**
- `Session.geoLocation` — location at login time
- `ActivityLog.geoLocation` — location when the action was performed

Resolved once per request into the request store (`RequestLogStoreKey`, as part of `IRequestLog`). Feature domains read it from the store and pass `IRequestLog` to their repositories as the last method parameter; the repository persists the columns. See [Security and Middleware Documentation][ref-doc-security-and-middleware] for details.

---

### UserAgent

Represents parsed user-agent information from the client's `User-Agent` HTTP header using `ua-parser-js`. `UserAgent` is the top-level type that embeds four sub-types.

```prisma
model ActivityLog {
  userAgent Json
}

model Session {
  userAgent Json
}
```

**`UserAgent` fields:**

| Field | Type | Description |
|---|---|---|
| `ua` | `String?` | Raw user-agent string |
| `browser` | `UserAgentBrowser?` | Browser details |
| `cpu` | `UserAgentCpu?` | CPU architecture |
| `device` | `UserAgentDevice?` | Device details |
| `engine` | `UserAgentEngine?` | Rendering engine details |
| `os` | `UserAgentOs?` | Operating system details |

**Used in:**
- `Session.userAgent` — client info at login time
- `ActivityLog.userAgent` — client info when the action was performed

`RequestUtil.parseUserAgent(raw)` builds the composite from the `ua-parser-js` result: each field falls back to `null`, and a sub-type whose every field came back `null` is stored as `null` rather than as an object of nulls.

Resolved once per request into the request store (`RequestLogStoreKey`, as part of `IRequestLog`). Feature domains read it from the store and pass `IRequestLog` to their repositories as the last method parameter; the repository persists the columns. See [Security and Middleware Documentation][ref-doc-security-and-middleware] for details.

---

### User Term Policy Acceptance

The current acceptance state is stored directly on `User`, with one boolean column for each term policy type. Publishing a new policy version resets the corresponding column for every active, non-deleted user.

```prisma
model User {
  termsOfServiceAccepted Boolean @default(false)
  privacyAccepted        Boolean @default(false)
  cookiesAccepted        Boolean @default(false)
  marketingAccepted      Boolean @default(false)

  acceptances TermPolicyUserAcceptance[] @relation("TermPolicyUserAcceptanceUser")
}

model TermPolicyUserAcceptance {
  id           String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  userId       String   @db.Uuid
  termPolicyId String   @db.Uuid
  acceptedAt   DateTime @default(now())

  user       User       @relation("TermPolicyUserAcceptanceUser", fields: [userId], references: [id])
  termPolicy TermPolicy @relation("TermPolicyUserAcceptanceTermPolicy", fields: [termPolicyId], references: [id])

  createdAt DateTime @default(now())
  createdBy String?  @db.Uuid

  @@unique(fields: [userId, termPolicyId])
  @@index(fields: [termPolicyId, acceptedAt(sort: Desc)])
  @@map("term_policy_user_acceptances")
}
```

The boolean columns are used for access checks. `TermPolicyUserAcceptance` records which policy version the user accepted and when, preserving acceptance history through `User.acceptances`.

---

### UserPhoto

Represents the user's profile photo stored in AWS S3.

```prisma
model UserPhoto {
  id           String  @id @default(dbgenerated("uuidv7()")) @db.Uuid
  userId       String  @unique @db.Uuid
  bucket       String
  key          String
  cdnUrl       String?
  completedUrl String
  mime         String
  extension    String
  access       String
}
```

| Field | Type | Description |
|---|---|---|
| `bucket` | `String` | S3 bucket name |
| `key` | `String` | S3 object key |
| `cdnUrl` | `String?` | Full CDN URL of the object, `null` for a bucket with no CDN configured |
| `completedUrl` | `String` | Full S3 URL of the object |
| `mime` | `String` | MIME type (e.g. `image/jpeg`) |
| `extension` | `String` | File extension (e.g. `jpg`) |
| `access` | `String` | Access level (`public` or `private`) |

**Used in:**
- `User.photo`

### Policy

Represents the CASL ability grant for a `Role` on one policy subject. One row covers every allowed action for that subject.

```prisma
model Policy {
  id      String             @id @default(dbgenerated("uuidv7()")) @db.Uuid
  roleId  String             @db.Uuid
  subject EnumPolicySubject
  action  EnumPolicyAction[]
}
```

| Field | Type | Description |
|---|---|---|
| `roleId` | `String` | Owning role |
| `subject` | `EnumPolicySubject` | Policy subject (e.g. `user`, `apiKey`, `workspace`) |
| `action` | `EnumPolicyAction[]` | Allowed actions on the subject (`manage`, `read`, `create`, `update`, `delete`) |

The `[roleId, subject]` pair is unique, so a role holds at most one policy row per subject.

**Used in:**
- `Role.policies` (relation `RolePolicy`)

`migration.policy.seed.ts` seeds one `Policy` row per `EnumPolicySubject` value for the `admin` role, granting every `EnumPolicyAction`. `superadmin` and `user` seed with no policy rows.

See [Authorization Documentation][ref-doc-authorization] for how policies are evaluated at runtime.

---

### TermPolicyContent

Represents a localized content file for a term policy document, stored in AWS S3.

```prisma
model TermPolicyContent {
  id           String                 @id @default(dbgenerated("uuidv7()")) @db.Uuid
  termPolicyId String                 @db.Uuid
  language     EnumMessageLanguage
  bucket       String
  key          String
  cdnUrl       String?
  completedUrl String
  mime         String
  extension    String
  access       EnumAwsS3Accessibility
  size         Int

  @@unique(fields: [termPolicyId, language])
}
```

One content row per language per term policy: `@@unique([termPolicyId, language])`.

| Field | Type | Description |
|---|---|---|
| `language` | `EnumMessageLanguage` | Language code (e.g. `en`) |
| `bucket` | `String` | S3 bucket name |
| `key` | `String` | S3 object key |
| `cdnUrl` | `String?` | Full CDN URL of the object, `null` for a bucket with no CDN configured |
| `completedUrl` | `String` | Full S3 URL of the object |
| `mime` | `String` | MIME type (e.g. `application/pdf`) |
| `extension` | `String` | File extension (e.g. `pdf`) |
| `access` | `EnumAwsS3Accessibility` | Access level (`public` or `private`) |
| `size` | `Int` | File size in bytes |

**Used in:**
- `TermPolicy.contents`


## Audit Fields and Soft Delete

Audit fields are stamped automatically by a Prisma Client Extension named `audit-actor`. `DatabaseExtensionUtil.build()` (`src/common/database/utils/database.extension.util.ts`) defines it with `Prisma.defineExtension`, closing over the actor getter, the clock, and the stampers; `DatabaseClientFactory.create()` applies it with `$extends`. A repository write reached only from an authenticated HTTP request leaves `createdBy` / `updatedBy` to the extension, which fills them from the request actor. A write that also runs with no actor (a queue processor, a seed, a public route) passes the audit value explicitly.

### Client Access Surface

Three roles, wired together in `src/common/database/database.module.ts`:

- `DatabaseClientFactory` (`factories/database.client.factory.ts`) extends `PrismaClient<IDatabaseClientOptions, ...>`, holds the connection options (event-emitting `log` levels and `errorFormat`), and returns the extended client from `create()`. `IDatabaseClientOptions` (`interfaces/database.client.interface.ts`) is `Prisma.PrismaClientOptions` with a required `log: Prisma.LogDefinition[]`.
- `DatabaseExtensionUtil` (`utils/database.extension.util.ts`) holds the per-model audit field set (built from `Prisma.ModelName` and `Prisma.<Model>ScalarFieldEnum`) and the stamping methods, and builds the extension in `build()`. Nested writes are walked through `DatabaseModelRelations` (`constants/database.constant.ts`), a relation-field to related-model map per model, typed by `IDatabaseModelRelations` against `Prisma.TypeMap` so a schema change that adds, removes, or retargets a relation fails `pnpm typecheck` until the map matches.
- `DatabaseService` (`services/database.service.ts`) owns the Prisma event log handlers and the connect/disconnect lifecycle, and exposes two public members: `client` and `withTransaction(fn, options?)`, which runs `fn` inside `client.$transaction` with the `tx` client.

The extension carries the `create` / `createMany` / `update` / `updateMany` / `upsert` query hooks and the `softDelete` / `restore` model methods, all registered against `$allModels`. `IDatabaseClient` (`interfaces/database.client.interface.ts`) is the `ReturnType` of `DatabaseClientFactory['create']`, so the client type follows the extension automatically; the leaf types the extension needs (`IDatabaseRow`, `IDatabaseSoftDeleteArgs`, `IDatabaseRestoreArgs`, and their data shapes) live in `interfaces/database.extension.interface.ts`.

`DatabaseClientToken` (`constants/database.constant.ts`) is a Symbol bound to a `useFactory` provider that calls `DatabaseClientFactory.create()` once, so the extended client is a singleton. The token and the factory stay unexported; `DatabaseModule` exports `DatabaseService`, `DatabaseUtil`, and `DatabaseExtensionUtil`.

The same interface file exports `IDatabaseTransactionClient`, the `tx` type for the callback form of `$transaction`; `Prisma.TransactionClient` does not match the extended client, so derive from this instead. The module also owns one shared error: `EnumDatabaseStatusCodeError.uniqueValueGenerationFailed` (`51800`, `enums/database.status-code.enum.ts`) with `DatabaseUniqueValueGenerationFailedException` (`exceptions/database.unique-value-generation-failed.exception.ts`, HTTP 500, message `database.error.uniqueValueGenerationFailed`), thrown directly by a repository when a generated unique value cannot be settled. See [Generated Unique Values](#generated-unique-values).

What that means for callers:

- Repositories and migration seeds read and write through `databaseService.client.<model>`. There is no alternative: `DatabaseService` does not extend `PrismaClient` and exposes no model delegate. Every query through `client` participates in actor stamping and gains the `softDelete` / `restore` methods.
- A Prisma extended client does not expose `$on`, so the event log handlers are registered against the raw `DatabaseClientFactory` instance. `$connect`, `$disconnect`, `$transaction`, `$queryRaw`, and `$executeRaw` all work on `client`.
- `$transaction` accepts both Prisma forms: the array form for a sequential batch with no branching, and the callback form when the work needs a read between writes, must branch on an intermediate result, or spans more than one repository. Both run on `client`, so audit stamping still fires inside them. In the callback form every statement uses the `tx` client; a call back to `databaseService.client` escapes the transaction.
- A repository issues statements only against the model it owns, plus satellite models that have no repository of their own (`DeviceOwnershipRepository` owns `DeviceOwnership` and `Device`). Another model's row is reached through that model's repository, composed by a domain. `ActivityLog` is written by `ActivityLogRepository.create` and `createInTx`. Feature domains record a log inside a caller-owned transaction through `ActivityLogDomain.recordInTx`.
- When a write spans more than one repository, the domain calls `this.databaseService.withTransaction` and each collaborator is an `*InTx(tx, ...)` method with required `tx: IDatabaseTransactionClient`. A method that does not join a caller-owned transaction takes no `tx`. `WorkspaceDomain.commitOnboarding` opens the onboarding `withTransaction` (`UserHttpModule` imports `WorkspaceDomainModule`; `UserDomainModule` does not). The constraint when changing this: `rules/database.md`.
- The PostgreSQL health check lives in `HealthDatabaseIndicator.isHealthy()` (`src/modules/health/indicators/health.database.indicator.ts`), which calls `databaseService.client.$queryRaw\`SELECT 1\``. `DatabaseService` carries no health method.

### Automatic Actor Stamping

- On `create`, `createMany`, `update`, `updateMany`, and `upsert`, the extension fills `createdBy` and `updatedBy` from the current request actor.
- The actor is the authenticated `request.user.userId`, written into the request store under `RequestActorStoreKey` by the global `RequestActorInterceptor` after JWT authentication. A request with no authenticated user carries no actor, and nothing is stamped.
- A field is filled only when the model actually has that column and the caller left it null. An explicit value the caller passes always wins.
- `createdBy`, `updatedBy`, and `deletedBy` are `String? @db.Uuid`; they store the actor's user id.

**Stamping recurses into nested writes.** `DatabaseExtensionUtil.stampRelations` walks the payload's relation fields, and `stampNestedWrite` stamps every write verb a relation container can hold: `create`, `createMany`, `connectOrCreate`, `update`, `updateMany`, and `upsert`. Each nested write is stamped against the **related** model, resolved through `DatabaseModelRelations`, and the recursion continues to any deeper level.

For a caller this means a nested write on an authenticated request needs no hand-written `createdBy` / `updatedBy`. An explicit one appears only where the value is not the acting user or no actor exists.

### Soft Delete and Restore

The extension adds two methods to every model. They are meaningful only on models that carry both soft-delete columns `deletedAt` and `deletedBy`: `User`, `Workspace`, and `Project`. `ProjectRepository.softDelete` calls `client.project.softDelete` with no transaction. `WorkspaceDomain.softDeleteWorkspace` prepares `workspaceDeleted`, then opens `withTransaction`: `WorkspaceRepository.softDeleteInTx` calls `tx.workspace.softDelete` with the shared `deletedAt`, `ProjectDomain.softDeleteByWorkspaceInTx` soft-deletes the still-active projects through `updateMany` with the same `deletedAt` and an explicit `deletedBy` (the `updateMany` hook stamps no `deletedBy`), pending invites are expired, and pending join requests are cancelled. After the commit it stages the prepared event.

- `softDelete({ where, data? })` sets `deletedAt` (defaults to now), `deletedBy` and `updatedBy` (default to the actor), and merges caller `data` (business fields and nested writes) into the same update. `data` may carry an explicit `deletedAt`, `deletedBy`, or `updatedBy` alongside the business fields, and that value wins over the default. `UserDomain.deleteSelf` prepares `userRevokeAllSessions` (a `user = target` row, with the user passed as `userId` and `createdBy`) and `userDeleteSelf`, then opens one `withTransaction` that calls `UserRepository.deleteSelfInTx` (soft-delete plus `status: inactive`), revokes every live session of the user, and revokes every live device ownership of the user with its device's push token cleared. After the commit it purges every session cache entry of the user, stages `userRevokeAllSessions`, then stages `userDeleteSelf`.
- `restore({ where, data? })` clears `deletedAt` and `deletedBy` back to null, sets `updatedBy` from the actor, and merges caller `data`. An explicit `updatedBy` in `data` wins.
- A hard delete (`delete` / `deleteMany`) writes no audit fields.

**Reads are not filtered.** The extension only writes audit fields; it never rewrites a `where`. Excluding soft-deleted rows stays explicit, so a read against a soft-deletable model carries `deletedAt: null` itself. An automatic read filter is deliberately not applied: `PaginationService` counts through `repository.count()`, which such a filter would leave unfiltered, making a page and its total disagree.

### Delete Behaviour of Foreign Keys

A physical delete follows the `onDelete` action declared on each relation in `prisma/schema.prisma`. Soft delete (`deletedAt`) fires no foreign-key action.

| Action | Relations |
|---|---|
| `Cascade` | Every required foreign key under `User` (`UserMobileNumber`, `Verification`, `PasswordHistory`, `ActivityLog`, `Session`, `DeviceOwnership`, `TwoFactor`, `TermPolicyUserAcceptance`, `ForgotPassword`, `Notification`, `NotificationUserSetting`, `WorkspaceMember`, `WorkspaceJoinRequest`, `ProjectMember`); `Session.deviceOwnership`; `DeviceOwnership.device`; `NotificationDelivery.notification`; `Verification.mobileNumber`; `ActivityLog.workspace`; `WorkspaceMember`, `WorkspaceJoinRequest`, `WorkspaceInvite` and `Project` to `Workspace`; `WorkspaceInvite.project`; `ProjectMember` to `Project` |
| `SetNull` | `Session.revokedBy`, `DeviceOwnership.revokedBy`, `WorkspaceInvite.invitedBy` (nullable), `WorkspaceInvite.acceptedBy`, `WorkspaceJoinRequest.reviewedBy`, `User.lastWorkspace` |
| `Restrict` | `User.role`, `User.country`, `UserMobileNumber.country`, `TermPolicyUserAcceptance.termPolicy` |

Deleting a `User` row therefore removes its sessions, device ownerships, two-factor rows, verifications, password history, notifications, term policy acceptances, workspace and project memberships, and activity log rows, and nulls the actor references other rows hold to it. Deleting a `Workspace` row removes its members, join requests, invites, projects (and their members), and workspace-scoped activity log rows. `migration:remove` for `user` and `workspace` is one `deleteMany` each and relies on this.

## Generated Unique Values

Some columns carry a server-generated value that must be unique: workspace and project slugs today. A random draw can collide with a row that already holds it, so every generator works from a **bounded candidate list that ends in a thrown exception**, never an unbounded loop and never a leaked Prisma error.

The shape is the same in all three places:

1. The caller draws the whole candidate list up front, `slugMaxAttempts` entries of `HelperStringService.generateSlug(prefix, maxLength)` (`5` for both `workspace` and `project`), and passes the list down.
2. The consumer writes with one candidate at a time. A unique collision on that column fails that write (rolling back its transaction where there is one) and the next candidate is tried.
3. When the list runs out, it throws `DatabaseUniqueValueGenerationFailedException` (`51800`, HTTP 500).

The collision is recognised by `DatabaseUtil.isUniqueCollision(error, field)`: true for a `Prisma.PrismaClientKnownRequestError` with code `P2002` whose `meta.target` names `field`, case-insensitively.

| Candidate source | Consumer | Retry unit |
|---|---|---|
| `WorkspaceDomain.drawSlugCandidates()` | `WorkspaceDomain.createWorkspace` | the `withTransaction`: `createInTx` (workspace plus owner membership) |
| `ProjectDomain.drawSlugCandidates()` | `ProjectRepository.create` | one `client.project.create` per candidate, with no transaction |
| `UserOnboardingDomain.buildPersonalWorkspaceContexts()` | `WorkspaceDomain.commitOnboarding` | the whole onboarding `withTransaction` |

Three rules hold across all of them:

- **A `P2002` on a value the repository did not draw is rethrown untouched.** `isUniqueCollision` is asked about the generated column by name, so a violation on a client-supplied field stays the caller's error. Onboarding translates the two it owns through `UserOnboardingUtil.mapCreateCollision`, turning a `username` collision into `UserUsernameExistException` and an `email` collision into `UserEmailExistException`.
- **The candidate list is an argument, never a client field.** `WorkspaceCreateRequestDto` and `ProjectCreateRequestDto` carry no slug, and the personal-workspace sign-up context carries `slugCandidates: string[]` that the onboarding repository indexes by attempt number.
- **A batch retries as a batch.** `WorkspaceDomain.commitOnboarding` substitutes the same candidate index into every personal workspace in the batch and re-runs the whole `withTransaction`, so its attempt budget is the smallest candidate list in the batch. Admin CSV import is the caller that uses it.

## Docker

Running database commands inside Docker containers from your host machine:

**Generate Prisma Client inside container:**
```bash
docker-compose exec apis pnpm db:generate
```

**Run database migration inside container:**
```bash
docker-compose exec apis pnpm db:migrate
```

**Run all seeds inside container:**
```bash
docker-compose exec apis pnpm migration:seed
```

**Remove all seeded data inside container:**
```bash
docker-compose exec apis pnpm migration:remove
```

These commands execute directly in the running Docker container without needing to enter the container shell. Ensure Docker Compose is running with `docker-compose up -d` before executing these commands.

## Database Tools

### **Prisma ORM**

The database client is **[Prisma][ref-prisma] v6.19.x**.

### **Why Prisma for Repository Design Pattern?**

Repositories talk to Prisma:

- Generated TypeScript types on repository queries
- `PrismaClient` is the database boundary
- Shared query API and transactions
- `prisma/schema.prisma` uses `provider = "postgresql"`; schema changes use Prisma Migrate

### PostgreSQL Design

Prisma, combined with the Repository Pattern, keeps database logic inside repositories. Services and controllers should consume module interfaces, DTOs, and repository methods rather than building Prisma queries directly.

#### Current Database

| Database | Best For | Transaction Support |
|----------|----------|---------------------|
| **PostgreSQL** | Relational Database, reliability | ✅ Yes |

**Environment** (`.env`):
```bash
DATABASE_URL=postgresql://ack:ack_password@localhost:5432/ACKNestJs?schema=public
```

**Schema and client:**
```bash
pnpm db:migrate
pnpm db:generate
```

**Seeds:**
```bash
pnpm migration:seed
```

#### Learn More

- [Prisma Migrate][ref-prisma-migrate]
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)


<!-- REFERENCES -->

[ref-prisma]: https://www.prisma.io
[ref-prisma-migrate]: https://www.prisma.io/docs/orm/prisma-migrate
[ref-commander]: https://nest-commander.jaymcdoniel.dev

[ref-doc-installation]: installation.md
[ref-doc-environment]: environment.md
[ref-doc-configuration]: configuration.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-activity-log]: activity-log.md
