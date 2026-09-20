# Database Documentation

The Database Module lives in `src/common/database`.

## Overview

Prisma + MongoDB replica set, transactions, seeds, and the Database Module.

## Related Documents

- [Installation Documentation][ref-doc-installation] - Project setup (Docker recommended)
- [Environment Documentation][ref-doc-environment] - Database connection and other env vars
- [Configuration Documentation][ref-doc-configuration] - Config module structure
- [Email Documentation][ref-doc-email] - SES templates and `templateEmailNotification`
- [Term Policy Documentation][ref-doc-term-policy] - Term policy rows and `templateTermPolicy`
- [Third Party Integration][ref-doc-third-party-s3] - S3 bucket setup (`awsS3Config`)

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Migration](#migration)
- [Generate Database Client](#generate-database-client)
- [Seeding](#seeding)
	- [Database Seeds](#database-seeds)
- [Initial Seeded Data](#initial-seeded-data)
	- [API Keys](#api-keys)
	- [Roles](#roles)
	- [Users](#users)
	- [Feature Flags](#feature-flags)
	- [Term Policies](#term-policies)
- [Models](#models)
- [Composite Types](#composite-types)
	- [GeoLocation](#geolocation)
	- [UserAgent](#useragent)
	- [UserTermPolicy](#usertermpolicy)
	- [UserPhoto](#userphoto)
	- [TermPolicyContent](#termpolicycontent)
- [Audit Fields and Soft Delete](#audit-fields-and-soft-delete)
	- [Client Access Surface](#client-access-surface)
	- [Automatic Actor Stamping](#automatic-actor-stamping)
	- [Soft Delete and Restore](#soft-delete-and-restore)
	- [Delete Behaviour of Foreign Keys](#delete-behaviour-of-foreign-keys)
- [Generated Unique Values](#generated-unique-values)
- [Database Tools](#database-tools)
	- [Prisma ORM](#prisma-orm)
	- [Database provider](#database-provider)


## Prerequisites

**Docker is the recommended way to run MongoDB locally.** Compose starts a replica set for you. Step-by-step: [Installation Documentation][ref-doc-installation].

Without Docker, use a [MongoDB Atlas][ref-mongodb-atlas] cluster (or any MongoDB 8+ **replica set**). Prisma transactions need a replica set; a standalone local MongoDB will not work.

Local Compose uses `mongo:latest`. Redis for cache and queues is covered in the same installation guide (Compose or [Amazon ElastiCache][ref-elasticache]).

## Migration

Prisma has no migration history for MongoDB. Schema sync is `prisma db push`.

In this project that is:

```bash
pnpm db:migrate
```

Official reference: [Prisma for MongoDB][ref-prisma-mongodb]


## Generate Database Client

After you edit `prisma/schema.prisma`:

```bash
pnpm db:generate
```

That writes the ESM client into `src/generated/prisma-client` (gitignored). App code imports `@generated/prisma-client/client`. `pnpm generate` also runs `generate:package`. First-time setup: [Installation][ref-doc-installation].


## Seeding

Seeds run through nest-commander (`src/migration/seeds/*`, data in `src/migration/data/*`).

Commands that are **not** database seeds (run separately; not in `migration:seed`):

- SES email templates: [Email][ref-doc-email] (`templateEmailNotification`)
- Term policy HTML on S3: [Term Policy][ref-doc-term-policy] (`templateTermPolicy`)
- S3 bucket policy/CORS: [Third Party Integration][ref-doc-third-party-s3] (`awsS3Config`)

### Database Seeds

**Run all database seeds:**
- `pnpm migration:seed` runs every database seed command
- `pnpm migration:remove` runs every seed's removal (deletes more than the seeded rows; see the warning under [Users](#users))
- `pnpm migration:fresh` force-resets the schema (`prisma db push --force-reset`) then re-seeds. Handy for a clean local slate

**Order in `package.json`:**

- `migration:seed`: `apiKey` → `country` → `featureFlag` → `role` → `policy` → `termPolicy` → `user` → `workspace`. A seed that needs another seed's rows runs after it (`policy` needs `role`, `user` needs `role` and `country`, `workspace` needs users).
- `migration:remove`: `workspace` → `user` → `apiKey` → `featureFlag` → `country` → `policy` → `role` → `termPolicy` (referrer before referenced).
- Every database seed is idempotent: re-running `migration:seed` on a DB that already has the rows is safe.

**Seed transactions.** A seed that writes several rows:

1. opens one `DatabaseService.withTransaction` in callback form
2. issues every statement on `tx` one after another
3. passes `{ timeout }` from `database.seedTransactionTimeoutInMs` (60 seconds)

The same timeout applies to the transactions the `user` and `workspace` seeds open in `remove()`.

Work that does not touch the database runs before the transaction:

- key and hash derivation in the `apiKey` seed
- ids, bcrypt password hashes, and verification tokens in the `user` seed

Every other `remove()` that deletes rows runs its delete on `client` with no transaction.

**The seed actor.** `MigrationUserSuperAdminId` (`src/migration/data/migration.user.data.ts`) is a fixed ObjectId. The `user` seed creates the superadmin with that `_id`, and every seed that writes rows uses it as the actor:

- An upsert's `create` branch writes `createdBy` and `updatedBy` as `MigrationUserSuperAdminId`; its `update` branch writes `updatedBy`. A re-run therefore updates `updatedBy` / `updatedAt` on seeded rows that have those columns, and leaves `createdBy` and `_id` untouched.
- The `workspace` seed writes the same actor on each workspace and passes it to `WorkspaceMemberRepository.createInTx` for the owner membership (`createdBy` and `updatedBy`).
- `createdBy` does not mark a row as seeded. A row the superadmin later creates through the admin API carries the same id, so no `remove()` filters on it. The `workspace` seed's `remove()` finds its rows by the name `<username>'s Workspace` together with an owner membership of that user.

**One module at a time:**
- Seed: `pnpm migration {module} --type seed`
- Remove: `pnpm migration {module} --type remove`

**Types:** `seed` (add) and `remove` (delete).

**Database modules:**

- `apiKey`: Default and system API keys
- `country`: Country data (name, codes, phone code, continent, timezone)
- `featureFlag`: Feature flags (login methods, sign up, change password, and similar)
- `role`: Roles (superadmin, admin, user)
- `policy`: Policy rows attached to each seeded role
- `termPolicy`: Term policy documents (cookies, marketing, privacy, terms of service)
- `user`: Initial accounts (Super Admin, Admin, User) with country, role, and credentials
- `workspace`: One default personal workspace per seeded user as owner. Needs `user` first; skips users who already own a workspace


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

The `termPolicy` seed creates each record with an empty `contents` array and `status: published`. The document bodies are Handlebars templates in `src/modules/term-policy/templates/*.hbs`, one per type. Linking them onto S3 is `templateTermPolicy`: [Term Policy][ref-doc-term-policy].


## Models

Every model in `prisma/schema.prisma` maps to a MongoDB collection through `@@map`. The Prisma name is what repositories address on `databaseService.client.<model>`; the collection name is what you see in MongoDB.

| Model | Collection | Purpose |
|---|---|---|
| `ApiKey` | `ApiKeys` | API key credentials for machine access |
| `Role` | `Roles` | Roles |
| `Policy` | `Policies` | The `(subject, action[])` rows a role grants, evaluated through CASL |
| `Country` | `Countries` | Country reference data |
| `UserMobileNumber` | `UserMobiles` | A user's mobile numbers and their verification state |
| `User` | `Users` | User accounts |
| `Verification` | `Verifications` | Email and mobile verification tokens |
| `PasswordHistory` | `PasswordHistories` | Previous password hashes for reuse checks |
| `ActivityLog` | `ActivityLogs` | Audit trail of user actions |
| `Session` | `Sessions` | Issued refresh sessions per device |
| `Device` | `Devices` | Devices identified by fingerprint |
| `DeviceOwnership` | `DeviceOwnerships` | Link between a user and a device |
| `TwoFactor` | `TwoFactors` | Two-factor secret, attempt counter, and backup codes |
| `TermPolicy` | `TermPolicies` | Term policy documents and versions |
| `TermPolicyUserAcceptance` | `TermPolicyUserAcceptances` | A user's acceptance of one policy version |
| `FeatureFlag` | `FeatureFlags` | Feature toggles with rollout percent and metadata |
| `ForgotPassword` | `ForgotPasswords` | Password reset tokens |
| `Notification` | `Notifications` | Notification records |
| `NotificationDelivery` | `NotificationDeliveries` | Per-channel delivery outcome of a notification |
| `NotificationUserSetting` | `NotificationUserSettings` | Per-user channel and type preferences |
| `Workspace` | `Workspaces` | Workspaces |
| `WorkspaceMember` | `WorkspaceMembers` | Workspace membership and role |
| `WorkspaceInvite` | `WorkspaceInvites` | Outstanding workspace invitations |
| `WorkspaceJoinRequest` | `WorkspaceJoinRequests` | Requests to join a public workspace |
| `Project` | `Projects` | Projects inside a workspace |
| `ProjectMember` | `ProjectMembers` | Project membership and role |

## Composite Types

Prisma composite types are embedded sub-documents in MongoDB (not separate collections). They are defined with the `type` keyword in `prisma/schema.prisma` and stored inline within the parent document rather than in separate collections.

### GeoLocation

Represents the geographic location derived from a client's IP address using `geoip-lite`.

```prisma
type GeoLocation {
  latitude  Float
  longitude Float
  country   String
  region    String
  city      String
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
- `Session.geoLocation`: location at login time
- `ActivityLog.geoLocation`: location when the action was performed

Resolved once per request into the request store (`RequestLogStoreKey`, as part of `IRequestLog`). Feature domains read it from the store and pass `IRequestLog` to their repositories as the last method parameter; the repository persists the columns. See [Security and Middleware Documentation][ref-doc-security-and-middleware] for details.

---

### UserAgent

Represents parsed user-agent information from the client's `User-Agent` HTTP header using `ua-parser-js`. `UserAgent` is the top-level type that embeds four sub-types.

```prisma
type UserAgent {
  ua      String?
  browser UserAgentBrowser?
  cpu     UserAgentCpu?
  device  UserAgentDevice?
  engine  UserAgentEngine?
  os      UserAgentOs?
}

type UserAgentBrowser {
  name    String?
  version String?
  major   String?
  type    String?
}

type UserAgentCpu {
  architecture String?
}

type UserAgentDevice {
  type   String?
  vendor String?
  model  String?
}

type UserAgentEngine {
  name    String?
  version String?
}

type UserAgentOs {
  name    String?
  version String?
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
- `Session.userAgent`: client info at login time
- `ActivityLog.userAgent`: client info when the action was performed

`RequestUtil.parseUserAgent(raw)` builds the composite from the `ua-parser-js` result: each field falls back to `null`, and a sub-type whose every field came back `null` is stored as `null` rather than as an object of nulls.

Resolved once per request into the request store (`RequestLogStoreKey`, as part of `IRequestLog`). Feature domains read it from the store and pass `IRequestLog` to their repositories as the last method parameter; the repository persists the columns. See [Security and Middleware Documentation][ref-doc-security-and-middleware] for details.

---

### UserTermPolicy

Represents the user's acceptance flags for each term policy type. Stored inline on the `User` document.

```prisma
type UserTermPolicy {
  termsOfService Boolean
  privacy        Boolean
  marketing      Boolean
  cookies        Boolean
}
```

| Field | Type | Description |
|---|---|---|
| `termsOfService` | `Boolean` | Has accepted Terms of Service |
| `privacy` | `Boolean` | Has accepted Privacy Policy |
| `marketing` | `Boolean` | Has accepted Marketing terms |
| `cookies` | `Boolean` | Has accepted Cookie policy |

**Used in:**
- `User.termPolicy`

---

### UserPhoto

Represents the user's profile photo stored in AWS S3.

```prisma
type UserPhoto {
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

---

### TermPolicyContent

Represents a localized content file for a term policy document, stored in AWS S3.

```prisma
type TermPolicyContent {
  language     String
  bucket       String
  key          String
  cdnUrl       String?
  completedUrl String
  mime         String
  extension    String
  access       String
  size         Int
}
```

| Field | Type | Description |
|---|---|---|
| `language` | `String` | Language code (e.g. `"en"`) |
| `bucket` | `String` | S3 bucket name |
| `key` | `String` | S3 object key |
| `cdnUrl` | `String?` | Full CDN URL of the object, `null` for a bucket with no CDN configured |
| `completedUrl` | `String` | Full S3 URL of the object |
| `mime` | `String` | MIME type (e.g. `application/pdf`) |
| `extension` | `String` | File extension (e.g. `pdf`) |
| `access` | `String` | Access level (`public` or `private`) |
| `size` | `Int` | File size in bytes |

**Used in:**
- `TermPolicy.contents`


## Audit Fields and Soft Delete

Audit fields are stamped automatically by a Prisma Client Extension named `audit-actor`. `DatabaseExtensionUtil.build()` (`src/common/database/utils/database.extension.util.ts`) defines it with `Prisma.defineExtension`, closing over the actor getter, the clock, and the stampers; `DatabaseClientFactory.create()` applies it with `$extends`. A repository write reached only from an authenticated HTTP request leaves `createdBy` / `updatedBy` to the extension, which fills them from the request actor. A write that also runs with no actor (a queue processor, a seed, a public route) passes the audit value explicitly.

### Client Access Surface

Three roles, wired together in `src/common/database/database.module.ts`:

- **`DatabaseClientFactory`** (`factories/database.client.factory.ts`): extends `PrismaClient<IDatabaseClientOptions, ...>`, holds the connection options (event-emitting `log` levels and `errorFormat`), and returns the extended client from `create()`. `IDatabaseClientOptions` (`interfaces/database.client.interface.ts`) is `Prisma.PrismaClientOptions` with a required `log: Prisma.LogDefinition[]`.
- **`DatabaseExtensionUtil`** (`utils/database.extension.util.ts`): holds the per-model audit field set (built from `Prisma.ModelName` and `Prisma.<Model>ScalarFieldEnum`) and the stamping methods, and builds the extension in `build()`. Nested writes are walked through `DatabaseModelRelations` (`constants/database.constant.ts`), a relation-field to related-model map per model, typed by `IDatabaseModelRelations` against `Prisma.TypeMap` so a schema change that adds, removes, or retargets a relation fails `pnpm typecheck` until the map matches.
- **`DatabaseService`** (`services/database.service.ts`): owns the Prisma event log handlers and the connect/disconnect lifecycle, and exposes two public members: `client` and `withTransaction(fn, options?)`, which runs `fn` inside `client.$transaction` with the `tx` client.

The extension carries these hooks and methods, all registered against `$allModels`:

- query hooks: `create`, `createMany`, `update`, `updateMany`, `upsert`
- model methods: `softDelete`, `restore`

`IDatabaseClient` (`interfaces/database.client.interface.ts`) is the `ReturnType` of `DatabaseClientFactory['create']`, so the client type follows the extension automatically. Leaf types the extension needs live in `interfaces/database.extension.interface.ts`:

- `IDatabaseRow`
- `IDatabaseSoftDeleteArgs`
- `IDatabaseRestoreArgs`
- and their data shapes

`DatabaseClientToken` (`constants/database.constant.ts`) is a Symbol bound to a `useFactory` provider that calls `DatabaseClientFactory.create()` once, so the extended client is a singleton. The token and the factory stay unexported; `DatabaseModule` exports:

- `DatabaseService`
- `DatabaseUtil`
- `DatabaseExtensionUtil`

The same interface file exports `IDatabaseTransactionClient`, the `tx` type for the callback form of `$transaction`; `Prisma.TransactionClient` does not match the extended client, so derive from this instead. The module also owns one shared error: `EnumDatabaseStatusCodeError.uniqueValueGenerationFailed` (`51800`, `enums/database.status-code.enum.ts`) with `DatabaseUniqueValueGenerationFailedException` (`exceptions/database.unique-value-generation-failed.exception.ts`, HTTP 500, message `database.error.uniqueValueGenerationFailed`), thrown directly by a repository when a generated unique value cannot be settled. See [Generated Unique Values](#generated-unique-values).

What that means for callers:

- Repositories and migration seeds read and write through `databaseService.client.<model>`. There is no alternative: `DatabaseService` does not extend `PrismaClient` and exposes no model delegate. Every query through `client` participates in actor stamping and gains the `softDelete` / `restore` methods.
- A Prisma extended client does not expose `$on`, so the event log handlers are registered against the raw `DatabaseClientFactory` instance. `$connect`, `$disconnect`, `$transaction`, and `$runCommandRaw` all work on `client`.
- In `src/modules`, every transaction opens through `DatabaseService.withTransaction`, which is Prisma's callback form of `$transaction` on `client`, so audit stamping still fires inside it. Every statement in the callback uses the `tx` client; a call back to `databaseService.client` escapes the transaction.
- A repository issues statements only against the model it owns, plus satellite models that have no repository of their own (`NotificationRepository` writes `NotificationDelivery` rows through a nested `createMany`). `DeviceRepository` owns `Device` and `DeviceOwnershipRepository` owns `DeviceOwnership`; `DeviceDomain` composes the two. Another model's row is reached through that model's repository, composed by a domain. `ActivityLog` is written only by `ActivityLogRepository.createMany`: feature domains prepare events with `ActivityLogDomain.prepare`, stage them with `ActivityLogDomain.stagePrepared` after the audited write, and `ActivityLogInterceptor` flushes them after the handler settles. See [Activity Log][ref-doc-activity-log].
- Who opens the transaction depends on how many statements and repositories the write spans:
  - A single-statement write against one document runs on `databaseService.client` with no transaction. MongoDB applies a single-document write atomically.
  - More than one statement, or a multi-document write, on one repository's own models: the repository method calls `this.databaseService.withTransaction` itself and takes no `tx`. `SessionRepository.revokeActiveByUser`, `ActivityLogRepository.createMany`, and `NotificationRepository.createMany` are examples.
  - A write that spans more than one repository: the domain calls `this.databaseService.withTransaction` and each collaborator is an `*InTx(tx, ...)` method with required `tx: IDatabaseTransactionClient`. A method that does not join a caller-owned transaction takes no `tx`. `DeviceDomain.refresh` opens the transaction around `DeviceOwnershipRepository.touchInTx` and `DeviceRepository.refreshInTx`. `WorkspaceDomain.commitOnboarding` opens the onboarding `withTransaction` (`UserHttpModule` imports `WorkspaceDomainModule`; `UserDomainModule` does not).
- `withTransaction(fn, options?)` takes `IDatabaseTransactionOptions` (`interfaces/database.client.interface.ts`), Prisma's `transactionOptions` shape. Omitted options keep Prisma's defaults (`maxWait` 2 s, `timeout` 5 s). A caller passes options only from its own `*TimeoutInMs` config key: `WorkspaceDomain.commitOnboarding` receives `user.onboarding.createTimeoutInMs` or `createBulkTimeoutInMs`, and the seeds read `database.seedTransactionTimeoutInMs`.
- The MongoDB ping lives in `HealthDatabaseIndicator.isHealthy()` (`src/modules/health/indicators/health.database.indicator.ts`), which calls `databaseService.client.$runCommandRaw({ ping: 1 })`. `DatabaseService` carries no health method.

### Automatic Actor Stamping

- On `create`, `createMany`, `update`, `updateMany`, and `upsert`, the extension fills `createdBy` and `updatedBy` from the current request actor.
- The actor is the authenticated `request.user.userId`, written into the request store under `RequestActorStoreKey` by the global `RequestActorInterceptor` after JWT authentication. A request with no authenticated user, a queue processor, and a seed carry no actor, and nothing is stamped.
- A field is filled only when the model has that column and the caller left it null. An explicit value the caller passes always wins.
- `createdBy`, `updatedBy`, and `deletedBy` are `String? @db.ObjectId`; they store the actor's user id.

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

## Database Tools

### Prisma ORM

The database client is **[Prisma][ref-prisma] v6.19.x**. Repositories talk to Prisma only: generated types, `PrismaClient` as the boundary, shared query API and transactions. Schema sync is `pnpm db:migrate` (`prisma db push`).

### Database provider

This boilerplate uses **MongoDB** (`provider = "mongodb"`). ObjectId helpers, replica-set transactions, and seed commands assume MongoDB. There is no `prisma migrate` history; shape changes go through `db push`.

PostgreSQL is on the project TODO. Setup and seeding for the current MongoDB path are in the sections above.

#### Learn More

- [Prisma MongoDB Documentation][ref-prisma-mongodb]
- [nest-commander][ref-nest-commander]


<!-- REFERENCES -->

[ref-prisma]: https://www.prisma.io
[ref-prisma-mongodb]: https://www.prisma.io/docs/orm/overview/databases/mongodb#commonalities-with-other-database-provider
[ref-nest-commander]: https://nest-commander.jaymcdoniel.dev
[ref-mongodb-atlas]: https://www.mongodb.com/products/platform/atlas-database
[ref-elasticache]: https://aws.amazon.com/elasticache/

[ref-doc-installation]: installation.md
[ref-doc-environment]: environment.md
[ref-doc-configuration]: configuration.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-email]: email.md
[ref-doc-third-party-s3]: third-party-integration.md#bucket-setup
[ref-doc-term-policy]: term-policy.md#migration--seeding
