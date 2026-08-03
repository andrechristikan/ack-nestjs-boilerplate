# Database Documentation

This documentation explains the features and usage of **Database Module**: Located at `src/common/database`

## Overview

This documentation explains the database architecture and features in ACK NestJS Boilerplate:

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
- [Composite Types](#composite-types)
	- [GeoLocation](#geolocation)
	- [UserAgent](#useragent)
	- [UserTermPolicy](#usertermpolicy)
	- [UserPhoto](#userphoto)
	- [RoleAbility](#roleability)
	- [TermPolicyContent](#termpolicycontent)
- [Audit Fields and Soft Delete](#audit-fields-and-soft-delete)
	- [Client Access Surface](#client-access-surface)
	- [Automatic Actor Stamping](#automatic-actor-stamping)
	- [Soft Delete and Restore](#soft-delete-and-restore)
- [Docker](#docker)
- [Database Tools](#database-tools)
	- [Prisma ORM](#prisma-orm)
	- [Why Prisma for Repository Design Pattern?](#why-prisma-for-repository-design-pattern)
	- [Change DB with Minimal Effort](#change-db-with-minimal-effort)


## Prerequisites

> **💡 Tip:** Use Docker setup from the installation guide for automatic MongoDB replica set configuration.

**MongoDB 8.0.x** running as a **replica set** (required for transactions)

## Migration

Prisma does not support migrations for MongoDB. Instead, use `prisma db push` to sync your Prisma schema with the MongoDB database.

In ACK NestJS Boilerplate, you can use the `pnpm db:migrate` script to quickly sync your schema to MongoDB.

For details, see the official Prisma documentation: [Prisma for MongoDB][ref-prisma-mongodb]


## Generate Database Client

Prisma uses a generated client to provide type-safe database access and query building. You must generate the Prisma Client every time you change your Prisma schema (`prisma/schema.prisma`).

**When to Generate Prisma client?**
- After any change to your Prisma schema (e.g., adding, removing, or updating models/fields).
- After pulling schema changes from version control.

**How to Generate Prisma Client:**
```bash
pnpm db:generate
```

This command will read your Prisma schema and generate the client code in `generated/prisma-client`. The generated client is required for your application to interact with the database using Prisma.


## Seeding

Seeding in ACK NestJS Boilerplate is handled using [Commander.js][ref-commander]. All seed commands are implemented in `src/migration/seeds/*`.

### Database Seeds

ACK NestJS Boilerplate provides ready-to-use seed scripts to help you quickly initialize or remove data for development and testing. Database seeding is used to populate the database with initial or test data, making development and testing easier.

**Seed Data Location:**
- All seed data is stored in `src/migration/data/*`.

**How to Run All Seeds:**
- `pnpm migration:seed` — runs all seed commands to populate initial data.
- `pnpm migration:remove` — removes all seeded data from the database.
- `pnpm migration:fresh` — force-resets the database schema (`prisma db push --force-reset`) then immediately re-seeds all data. Useful during development when you need a clean slate.

**Order matters, and it lives in the `package.json` scripts, not in `migration.module.ts`:**

- `migration:seed` runs `apiKey` → `country` → `featureFlag` → `role` → `termPolicy` → `user`. A seed that references another's rows runs after it, so `user` is last: it needs both `role` and `country`.
- `migration:remove` runs `user` → `apiKey` → `featureFlag` → `country` → `role` → `termPolicy`, removing the referrer before anything it references.
- Neither script runs the template seeds or the AWS S3 configuration seed. Those are invoked on their own.
- Every seed is idempotent: re-running `migration:seed` against a database that already holds the rows is safe.

**How to Seed/Remove a Specific Module:**
Run the command:
   - Seed: `pnpm migration {module} --type seed`
   - Remove: `pnpm migration {module} --type remove`

**Available Types:**
- `seed` (add data)
- `remove` (delete data)

**Available Modules:**

- `apiKey`: Inserts default and system API keys for authentication and service access.
- `country`: Inserts country data (name, codes, phone code, continent, timezone).
- `featureFlag`: Inserts feature flags to enable/disable features (e.g., login methods, sign up, change password).
- `role`: Inserts user roles (superadmin, admin, user) with abilities and permissions.
- `termPolicy`: Inserts term policy documents (cookies, marketing, privacy, terms of service) with version and content.
- `user`: Inserts initial user accounts (Super Admin, Admin, User) with country, role, and credentials.


### Template Seeds

Template seeding uses the same script and commands as Database Seeds, but is specifically for template files like email and term policies.

**Available Types:**
- `seed` (add template data)
- `remove` (delete template data)

#### Email Templates

Every time you run the email template seed, the templates will be inserted into AWS SES automatically.

**How to Run Email Template Seeds:**
- Seed: `pnpm migration template-email-notification --type seed`
- Remove: `pnpm migration template-email-notification --type remove`

#### Term Policy Templates

Every time you run the term policy template seed, the policy documents will be linked to the database records automatically.

**How to Run Term Policy Template Seeds:**
- Seed: `pnpm migration template-termPolicy --type seed`
- Remove: `pnpm migration template-termPolicy --type remove` *(no-op — term policy removal is intentionally skipped)*


### AWS S3 Configuration Seed

The migration script is a special seed command that configures AWS S3 bucket policies and settings for both public and private buckets. Unlike other seed commands, this migration doesn't populate database data but instead configures your AWS infrastructure.

**What It Does:**

This script automatically configures essential S3 bucket settings in the correct order:

1. **Block Public Access Configuration** - Controls public access restrictions
2. **Disable ACL Configuration** - Enforces bucket owner ownership controls
3. **Bucket Policy** - Sets read/write permissions based on bucket accessibility
4. **CORS Configuration** - Configures Cross-Origin Resource Sharing rules
5. **Lifecycle Configuration** - Automatically deletes incomplete multipart uploads

**Why Sequential Configuration Matters:**

The configuration must be applied in a specific order because AWS S3 policies have dependencies. 
For example, you must configure public access blocks before setting bucket policies.

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

When you run `pnpm migration:seed`, the following initial data will be created in your database. This data is essential for testing and development purposes.

### API Keys

> [!WARNING]
> These are development keys. Always regenerate API keys for production environments.

Two API keys are created for authentication and service access. They are seeded in the `local` environment only; `development`, `staging`, and `production` seed no api key.

| Name | Type | Key | Secret | Usage |
|------|------|-----|--------|-------|
| Api Key Default | `default` | `fyFGb7ywyM37TqDY8nuhAmGW5` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For general API access |
| Api Key System | `system` | `UTDH0fuDMAbd1ZVnwnyrQJd8Q` | `qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP` | For system-level operations |

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

This prefix is automatically added based on the `APP_ENV` environment variable when creating new API keys, ensuring easy identification and preventing accidental cross-environment usage.

### Roles

Three user roles are created with different permission levels:

| Role | Type | Description | Abilities |
|------|------|-------------|-----------|
| superadmin | `superAdmin` | Super Admin Role | Full system access (unrestricted) |
| admin | `admin` | Admin Role | All CRUD operations on all subjects |
| user | `user` | User Role | Limited access (no special abilities) |

**Admin Role Abilities**: The admin role has full CRUD permissions (`create`, `read`, `update`, `delete`) on all policy subjects defined in the system.

### Users

> [!WARNING]
> These are test accounts with default passwords. Change or remove these accounts in production environments.

The seeded users differ per environment. This is controlled by `migrationUserData` in `src/migration/data/migration.user.data.ts`:

| Environment | Seeded Users |
|---|---|
| `local` | superadmin + admin + user |
| `development` | superadmin + admin only |
| `staging` | superadmin + admin only |
| `production` | superadmin + admin only |

**User accounts:**

| Email | Name | Role | Password | Country | Environments |
|-------|------|------|----------|---------|-------------|
| superadmin@mail.com | Super Admin | superadmin | `aaAA@123` | ID (Indonesia) | all |
| admin@mail.com | Admin | admin | `aaAA@123` | ID (Indonesia) | all |
| user@mail.com | User | user | `aaAA@123` | ID (Indonesia) | `local` only |

### Feature Flags

Five feature flags are created to control authentication and user features:

| Key | Description | Enabled | Rollout | Metadata |
|-----|-------------|---------|---------|----------|
| `loginWithGoogle` | Enable login with Google | ✅ Yes | 100% | `signUpAllowed: true` |
| `loginWithApple` | Enable login with Apple | ✅ Yes | 100% | `signUpAllowed: true` |
| `loginWithCredential` | Enable login with Credential | ✅ Yes | 100% | - |
| `signUp` | Enable user sign up | ✅ Yes | 100% | - |
| `changePassword` | Enable change password feature | ✅ Yes | 100% | `forgotAllowed: true` |

All features are enabled by default with 100% rollout for development convenience.

### Term Policies

Four term policy documents are created:

| Type | Version | Language | Description |
|------|---------|----------|-------------|
| `cookies` | 1 | EN | Cookie policy document |
| `marketing` | 1 | EN | Marketing terms document |
| `privacy` | 1 | EN | Privacy policy document |
| `termsOfService` | 1 | EN | Terms of Service document |

The `termPolicy` seed creates each record with an empty `contents` array. The document bodies are Handlebars templates in `src/modules/term-policy/templates/*.hbs`, one per type. They are not linked automatically: run the term policy template seed to upload them to S3 and write the resulting `TermPolicyContent` entries onto the records.

For more details on how seeding works, see: [Template Seeds](#template-seeds)


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
- `Session.geoLocation` — location at login time
- `ActivityLog.geoLocation` — location when the action was performed

Resolved once per request into the request store (`RequestLogStoreKey`, as part of `IRequestLog`). The audit service reads it from the store and threads the `IRequestLog` to its repository as the last method parameter; the repository persists the columns. See [Security and Middleware Documentation][ref-doc-security-and-middleware] for details.

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
- `Session.userAgent` — client info at login time
- `ActivityLog.userAgent` — client info when the action was performed

Resolved once per request into the request store (`RequestLogStoreKey`, as part of `IRequestLog`). The audit service reads it from the store and threads the `IRequestLog` to its repository as the last method parameter; the repository persists the columns. See [Security and Middleware Documentation][ref-doc-security-and-middleware] for details.

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
| `cdnUrl` | `String?` | Optional CDN base URL |
| `completedUrl` | `String` | Full resolved URL (CDN or S3 direct) |
| `mime` | `String` | MIME type (e.g. `image/jpeg`) |
| `extension` | `String` | File extension (e.g. `jpg`) |
| `access` | `String` | Access level (`public` or `private`) |

**Used in:**
- `User.photo`

---

### RoleAbility

Represents a single CASL ability entry embedded in a `Role`. Each entry defines which actions are allowed on a given policy subject.

```prisma
type RoleAbility {
  action  String[]
  subject String
}
```

| Field | Type | Description |
|---|---|---|
| `action` | `String[]` | List of allowed actions (e.g. `["read", "create"]`) |
| `subject` | `String` | Policy subject (e.g. `"user"`, `"apiKey"`) |

**Used in:**
- `Role.abilities`

See [Authorization Documentation][ref-doc-authorization] for how abilities are evaluated at runtime.

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
| `cdnUrl` | `String?` | Optional CDN base URL |
| `completedUrl` | `String` | Full resolved URL |
| `mime` | `String` | MIME type (e.g. `application/pdf`) |
| `extension` | `String` | File extension (e.g. `pdf`) |
| `access` | `String` | Access level (`public` or `private`) |
| `size` | `Int` | File size in bytes |

**Used in:**
- `TermPolicy.contents`


## Audit Fields and Soft Delete

Audit fields are stamped automatically by a Prisma Client Extension named `audit-actor`. `DatabaseExtensionUtil.build()` (`src/common/database/utils/database.extension.util.ts`) defines it with `Prisma.defineExtension`, closing over the actor getter, the clock, and the stampers; `DatabaseClientFactory.create()` applies it with `$extends`. Repositories do not set `createdBy` / `updatedBy` by hand; the extension fills them from the authenticated request actor.

### Client Access Surface

Three roles, wired together in `src/common/database/database.module.ts`:

- `DatabaseClientFactory` (`factories/database.client.factory.ts`) extends `PrismaClient`, holds the connection options (event-emitting `log` levels and `errorFormat`), and returns the extended client from `create()`.
- `DatabaseExtensionUtil` (`utils/database.extension.util.ts`) holds the DMMF `modelFields` / `modelRelations` maps and the stamping methods, and builds the extension in `build()`.
- `DatabaseService` (`services/database.service.ts`) owns the Prisma event log handlers and the connect/disconnect lifecycle, and exposes one public member: `client`.

The extension carries the `create` / `createMany` / `update` / `updateMany` / `upsert` query hooks and the `softDelete` / `restore` model methods, all registered against `$allModels`. `IDatabaseClient` (`interfaces/database.client.interface.ts`) is the `ReturnType` of `DatabaseClientFactory['create']`, so the client type follows the extension automatically; the leaf types the extension needs (`IDatabaseRow`, `IDatabaseSoftDeleteArgs`, `IDatabaseRestoreArgs`, and their data shapes) live in `interfaces/database.extension.interface.ts`.

`DatabaseClientToken` (`constants/database.constant.ts`) is a Symbol bound to a `useFactory` provider that calls `DatabaseClientFactory.create()` once, so the extended client is a singleton. The token, the factory, and the extension util stay unexported; `DatabaseModule` exports only `DatabaseService` and `DatabaseUtil`.

What that means for callers:

- Repositories and migration seeds read and write through `databaseService.client.<model>`. There is no alternative: `DatabaseService` does not extend `PrismaClient` and exposes no model delegate. Every query through `client` participates in actor stamping and gains the `softDelete` / `restore` methods.
- A Prisma extended client does not expose `$on`, so the event log handlers are registered against the raw `DatabaseClientFactory` instance. `$connect`, `$disconnect`, `$transaction`, and `$runCommandRaw` all work on `client`.
- `$transaction` accepts both Prisma forms: the array form for a sequential batch with no branching, and the callback form when the work needs a read between writes or must branch on an intermediate result. Both run on `client`, so audit stamping still fires inside them. In the callback form use the `tx` client for every operation; a call back to `databaseService.client` escapes the transaction.
- The MongoDB ping lives in `HealthDatabaseIndicator.isHealthy()` (`src/modules/health/indicators/health.database.indicator.ts`), which calls `databaseService.client.$runCommandRaw({ ping: 1 })`. `DatabaseService` carries no health method.

### Automatic Actor Stamping

- On `create`, `createMany`, `update`, `updateMany`, and `upsert`, the extension fills `createdBy` and `updatedBy` from the current request actor.
- The actor is the authenticated `request.user.userId`, written into the request store under `RequestActorStoreKey` by the global `RequestActorInterceptor` after JWT authentication. A request with no authenticated user carries no actor, and nothing is stamped.
- A field is filled only when the model actually has that column and the caller left it null. An explicit value the caller passes always wins.
- `createdBy`, `updatedBy`, and `deletedBy` are `String? @db.ObjectId`; they store the actor's user id.

**Stamping recurses into nested writes.** `DatabaseExtensionUtil.stampRelations` walks the payload's relation fields, and `stampNestedWrite` stamps every write verb a relation container can hold: `create`, `createMany`, `connectOrCreate`, `update`, `updateMany`, and `upsert`. Each nested write is stamped against the **related** model, resolved from the Prisma DMMF rather than the parent's field set, and the recursion continues to any deeper level.

For a caller this means a nested write needs no hand-written `createdBy` / `updatedBy`. Keep one only where the value is deliberately not the acting user.

### Soft Delete and Restore

The extension adds two methods to every model. They are meaningful only on models that carry the soft-delete columns `deletedAt` and `deletedBy`; `User` is currently the only such model.

- `softDelete({ where, data? })` sets `deletedAt` (defaults to now), `deletedBy` and `updatedBy` (default to the actor), and merges caller `data` (business fields and nested writes) into the same update. `data` may carry an explicit `deletedAt`, `deletedBy`, or `updatedBy` alongside the business fields, and that value wins over the default. `UserRepository.deleteSelf` uses it to soft-delete the user, flip status, and write the nested activity log in one call.
- `restore({ where, data? })` clears `deletedAt` and `deletedBy` back to null, sets `updatedBy` from the actor, and merges caller `data`. An explicit `updatedBy` in `data` wins.
- A hard delete (`delete` / `deleteMany`) writes no audit fields.

**Reads are not filtered.** The extension only writes audit fields; it never rewrites a `where`. Excluding soft-deleted rows stays explicit, so a read against a soft-deletable model carries `deletedAt: null` itself. An automatic read filter is deliberately not applied: `PaginationService` counts through `repository.count()`, which such a filter would leave unfiltered, making a page and its total disagree.


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

ACK NestJS Boilerplate uses **[Prisma][ref-prisma] v6.19.x** as the primary database toolkit. Prisma is not just an ORM - it's a complete database toolkit that provides the foundation for implementing clean architecture patterns.

### **Why Prisma for Repository Design Pattern?**

Prisma perfectly enables **Repository Design Pattern** implementation:

- **Type-Safe Repository Layer**: Auto-generated TypeScript types ensure compile-time validation throughout repositories
- **Clean Architecture**: PrismaClient provides foundation for clean separation between database and business logic  
- **Easy Implementation**: Consistent query API and transaction support simplify repository development
- **Database Agnostic**: Switch between MongoDB, PostgreSQL without changing repository code

### Change DB with Minimal Effort

Prisma, combined with the Repository Pattern, allows you to switch databases with minimal effort and maximum codebase stability. The data access layer is fully abstracted, so your service and business logic remain unchanged regardless of the underlying database engine.

#### Supported Databases

| Database | Best For | Transaction Support |
|----------|----------|---------------------|
| **MongoDB** | Document-based, flexible schema | ✅ Yes (replica set) |
| **PostgreSQL** | Relational Database, reliability | ✅ Yes |

**Other supported databases:** MySQL, SQLite, SQL Server, CockroachDB

#### Quick Migration: MongoDB → PostgreSQL

**1. Update Prisma Schema** (`prisma/schema.prisma`):
```prisma
// Change provider
datasource db {
  provider = "postgresql"  // was: "mongodb"
  url      = env("DATABASE_URL")
}

// Update ID fields in all models
model User {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid  // was: @default(auto()) @map("_id") @db.ObjectId
  // Replace @db.ObjectId with @db.Uuid from all foreign keys
}
```

**2. Update Environment** (`.env`):
```bash
# From:
DATABASE_URL=mongodb://localhost:27017/ACKNestJs?replicaSet=rs0

# To:
DATABASE_URL=postgresql://user:password@localhost:5432/ACKNestJs
```

**3. Generate Migration & Client:**
```bash
pnpm prisma migrate dev --name init  # PostgreSQL
pnpm db:generate                      # Regenerate client
```

**4. Update Database Module Code:**

- **DatabaseClientFactory** (`src/common/database/factories/database.client.factory.ts`) - May require updates for connection options and database-specific features
- **DatabaseService** (`src/common/database/services/database.service.ts`) - May require updates for connection lifecycle and log event handling
- **DatabaseUtil** (`src/common/database/utils/database.util.ts`) - Replace MongoDB `ObjectId` helpers with UUID validators

**5. Re-seed Database:**
```bash
pnpm migration:seed
```

#### Learn More

- [Prisma: Switching Databases][ref-prisma-setup]
- [Prisma MongoDB Documentation][ref-prisma-mongodb]
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)


<!-- REFERENCES -->

[ref-prisma-mongodb]: https://www.prisma.io/docs/orm/overview/databases/mongodb#commonalities-with-other-database-provider
[ref-prisma-setup]: https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project#switching-databases
[ref-commander]: https://nest-commander.jaymcdoniel.dev

[ref-doc-installation]: installation.md
[ref-doc-environment]: environment.md
[ref-doc-configuration]: configuration.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-authorization]: authorization.md
