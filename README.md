[![Contributors][ack-contributors-shield]][ref-ack-contributors]
[![Forks][ack-forks-shield]][ref-ack-forks]
[![Stargazers][ack-stars-shield]][ref-ack-stars]
[![Issues][ack-issues-shield]][ref-ack-issues]
[![MIT License][ack-license-shield]][ref-ack-license]

[![NestJs][nestjs-shield]][ref-nestjs]
[![NodeJs][nodejs-shield]][ref-nodejs]
[![Typescript][typescript-shield]][ref-typescript]
[![PostgreSQL][postgresql-shield]][ref-postgresql]
[![JWT][jwt-shield]][ref-jwt]
[![Vitest][vitest-shield]][ref-vitest]
[![PNPM][pnpm-shield]][ref-pnpm]
[![Docker][docker-shield]][ref-docker]

# ACK NestJs Boilerplate 🔥 🚀

[ACK NestJs][ref-ack] is a [NestJs v12.x][ref-nestjs] boilerplate with JWT, OAuth (Google & Apple), OTP, TOTP/2FA, and RBAC. Powered by Prisma on **PostgreSQL**. Repository Design Pattern and Modular. Production-ready.

_[Request a feature][ref-ack-issues] or [report a bug][ref-ack-issues] on the issue tracker._

### Ideal For

The boilerplate targets:

- 🏢 **Enterprise Applications** - Auth with roles, CASL policies, and an activity log
- 🔐 **Authentication Services** - JWT, Google and Apple sign-in, and TOTP 2FA
- 📱 **Mobile App Backends** - REST API with social login, device tracking, and push notifications
- 🌐 **Multi-tenant SaaS** - Every user belongs to a workspace; projects are workspace-scoped, with invites and join requests
- 💼 **Startup MVPs** - Auth, workspaces, notifications, and file upload already wired


## Table of Contents

- [ACK NestJs Boilerplate 🔥 🚀](#ack-nestjs-boilerplate--)
    - [Ideal For](#ideal-for)
  - [Table of Contents](#table-of-contents)
  - [Important](#important)
  - [TODO](#todo)
    - [Next Features](#next-features)
    - [Drop Features](#drop-features)
    - [Test](#test)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
    - [🎯 Architecture Highlights](#-architecture-highlights)
    - [🔐 Authentication \& Security](#-authentication--security)
    - [📊 Database \& Storage](#-database--storage)
    - [⚡ Performance \& Optimization](#-performance--optimization)
    - [🛠 Development Experience](#-development-experience)
    - [📡 Integrations \& Monitoring](#-integrations--monitoring)
    - [🔔 Notifications](#-notifications)
    - [📝 Testing \& Documentation](#-testing--documentation)
  - [Quick Start](#quick-start)
  - [Database](#database)
  - [Installation](#installation)
  - [License](#license)
  - [Contribute](#contribute)
  - [Contact](#contact)
    - [Support This Project](#support-this-project)

## Important

- Stateful Authorization, using Redis-backed sessions and `JWT`.
- PostgreSQL is the primary database; run migrations before seeding or starting a fresh environment.
- If you change the environment value of `APP_ENV` to `production`, it will disable Documentation.
- In `production`, Sentry forwards only `warn`, `error`, and `fatal` logs to Sentry Logs; every other environment forwards all levels.
- Protection decorators stack in a fixed order. A route takes only the slots it needs, and the relative order of the ones it takes stays the same. Activity logging takes no slot: domains stage events and a global interceptor writes them.
    ```typescript
    @ExampleDoc()
    @Response('example.get')
    @TermPolicyAcceptanceProtected(...)
    @PolicyProtected({...})
    @RoleProtected(...)
    @ProjectMemberProtected(...)      // never on /admin
    @ProjectProtected()               // never on /admin
    @WorkspaceMemberProtected(...)    // never on /admin
    @WorkspaceProtected()             // never on /admin
    @UserProtected()
    @FeatureFlagProtected(...)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)          // @Post only
    @Get('/some-endpoint')
    ```
    Nest evaluates the stack bottom-up, so a decorator that depends on state an earlier one sets sits above it. `@FeatureFlagProtected()` sits above `@AuthJwtAccessProtected()` so the flag guard sees `request.user`; below it, the guard finds no user, skips the flag's `targetUserIds`, and buckets the rollout by the anonymous-ID header instead of the user ID. The constraint when changing this: `.claude/rules/http.md`. See [Authorization Documentation][ref-doc-authorization].
- `@HttpCode()` appears only on `@Post` routes: Nest answers `POST` with `201 Created` by default and every other method with `200 OK`.
- The project uses the `ES256` algorithm for Access Token, and `ES512` for Refresh Token.
- The project uses Prisma `6.19` with the `prisma-client` generator; `pnpm generate` writes the client into `src/generated/prisma-client`.
- The project uses pnpm as the package manager.
- Strict null convention: `undefined` appears only in optional request DTO fields; every other layer uses `T | null`.
- The code is native ESM (`"type": "module"`, `nodenext`), and `src/` imports go through `tsconfig.json` path aliases.

## TODO

- [x] 2FA with TOTP Authentication (e.g. Google Authenticator)
- [x] Recovery Codes Method
- [x] TOTP check on reset password, change password, and backup code regeneration
- [x] User import and export endpoints with presigned upload
- [x] `aws-s3-config` seed command that applies access, CORS, and lifecycle policies to the public and private S3 buckets; presign expiration is set in `aws.config.ts`
- [x] Device awareness, Geo Location with `geoip-lite`
- [x] Notification System includes silent, inApp, push, and email.
- [x] Activity Log records user activities staged by domains and written by a global interceptor
- [x] Activity Log bidirectional and self-activity logging: an action on another user writes a row for the actor and a row for the affected user, and each user's feed lists every row they own ([docs/activity-log.md][ref-doc-activity-log])
- [x] Optional HashiCorp Vault integration for secret management ([docs/vault.md][ref-doc-vault])
- [x] Multi-workspace tenancy with workspace-scoped projects ([docs/workspace.md][ref-doc-workspace], [docs/project.md][ref-doc-project])
- [x] Analytic admin dashboard, anomaly/fraud reports, and current-workspace metrics ([docs/analytic.md][ref-doc-analytic])

### Next Features

- [ ] Login with biometrics (fingerprint or face detection)
- [ ] Login with passkey
- [ ] Login with Github SSO
- [ ] Mobile number verification by WhatsApp and/or SMS
- [ ] Versioning System (force the frontend to update, especially mobile)

### Drop Features

- Sliding session (for example, a refresh token that expires after 7 days of inactivity but can be extended up to a fixed maximum lifetime)

### Test
- [x] Unit test
- [ ] Integration Test
- [ ] E2E Test
- [ ] Stress Test For Benchmark/Performance
- [ ] Load Test For Benchmark/Performance


## Prerequisites

The project assumes a programmer with intermediate knowledge of:

1. **[NestJs Fundamentals][ref-nestjs]** - Main framework with decorators, modules, services, and dependency injection
2. **[TypeScript][ref-typescript]** - Strong typing, interfaces, generics, and advanced TypeScript features
3. **[Prisma ORM][ref-prisma]** - Modern database toolkit for schema design, migrations, and type-safe queries
4. **[PostgreSQL][ref-postgresql]** - Relational database concepts, transactions, indexes, and constraints
5. **[Redis][ref-redis]** - Caching strategies, session storage, and queue management
6. **Repository Design Pattern** - Data access layer abstraction for maintainable code
7. **SOLID Principles** - Clean code architecture and dependency management
8. **Queue Systems** - Background job processing with [BullMQ][ref-bullmq]
9. **Optional. [Docker][ref-docker]** - Containerization for running the project

## Build with

The project runs on these versions:

| Name           | Version  |
| -------------- | -------- |
| NestJs         | v12.x    |
| NodeJs         | >= 24.15.0 |
| PNPM           | >= 10.25.0 (pin `pnpm@11.25.0`) |
| TypeScript     | v6.0.x   |
| Prisma         | v6.19.x  |
| PostgreSQL     | v18.x    |
| Redis          | v8.0.x   |
| Docker         | v28.5.x  |
| Docker Compose | v2.40.x  |

For more information see [package.json][ref-package-json]

## Objective

- Component based / modular folder structure
- Stateful authentication and authorization
- Repository Design Pattern
- Follow The Twelve-Factor App

## Features

### 🎯 Architecture Highlights

- **Repository Pattern** - Only repositories query Prisma.
HTTP path: Controller, HTTP service, domain, repository.
Queue path: Processor, processor service, domain.
- **Modular Structure** - One folder per feature under `src/modules/`
- **12-Factor App** - Configuration comes from environment variables, read by `registerAs` config files
- **Workspaces & Projects** - Every user lands in a workspace at creation, personal by default or the inviting workspace when they sign up through an invite; workspace and project membership, invites, and join requests, gated by the `workspace` feature flag

### 🔐 Authentication & Security

- **JWT Authentication** - ES256 for Access Token, ES512 for Refresh Token; every refresh issues a new `jti` and the session rejects the old one
- **Stateful Sessions** - Redis-backed sessions with token revocation support
- **Social Login** - Google OAuth and Apple Sign In integration
- **Two-Factor Authentication** - TOTP-based 2FA with backup recovery codes; secrets stored AES-256-GCM encrypted
- **RBAC & Policies** - Roles plus CASL policy abilities
- **API Key Protection** - `x-api-key` header guard through `@ApiKeyProtected()`
- **Rate Limiting** - Redis-backed sliding window shared across instances: an always-on per-IP limit plus opt-in per-user and per-route tiers
- **Security Headers** - Helmet non-documents profile: HSTS, X-Frame-Options, X-Content-Type-Options, Cross-Origin-Resource-Policy, X-Download-Options, X-Permitted-Cross-Domain-Policies

### 📊 Database & Storage
Modern ORM with relational database and file storage capabilities.

- **Prisma ORM** - Type-safe database toolkit with schema-driven queries
- **PostgreSQL** - Relational database with transaction support
- **Redis Caching** - Multi-level caching strategies for performance
- **AWS S3 Integration** - File storage with presigned URLs
- **Repository Pattern** - Repositories are the only layer that queries the database

### ⚡ Performance & Optimization

- **Background Jobs** - BullMQ queue system for async processing
- **Response Compression** - `compression` middleware on every route
- **SWC Compiler** - `nest build` and `nest start` compile with SWC
- **Pagination** - Offset and cursor pagination
- **Feature Flags** - Per-flag on/off switch, target user list, and percentage rollout bucketed by user ID or anonymous ID

### 🛠 Development Experience

- **NestJS 12.x** - On TypeScript 6 in `strict` mode
- **Swagger/OpenAPI 3** - Swagger UI and an OpenAPI 3.1.0 document built from the route schemas
- **API Versioning** - URI versioning (`/v1`), switched on by `URL_VERSIONING_ENABLE`
- **Request Validation** - Every request shape is a zod schema, validated by the global `RequestSchemaValidationPipe`
- **Error Handling** - Standardized error responses with i18n
- **Hot Reload** - `pnpm start:dev` runs `nest start --watch` with SWC next to a `tsc --watch` type check
- **Code Quality** - ESLint (with `eslint-plugin-security`), Prettier, cspell, and knip; Husky runs them, the type check, and the test suite before each commit, and commitlint on each message
- **Database Seeding** - Commander-based data population

### 📡 Integrations & Monitoring

- **Sentry** - Error tracking through `SentryService`, performance monitoring, and Pino log forwarding to Sentry Logs (environment-scoped levels); URLs, headers, cookies, and bodies are scrubbed before sending
- **AWS SES** - Transactional email delivery
- **Activity Logging** - Records user actions staged by domains and flushed after the handler settles
- **Analytic** - Live admin dashboard metrics, anomaly and fraud reports, and current-workspace user metrics ([docs][ref-doc-analytic])
- **Health Checks** - `/system/health` endpoints for AWS, database, third-party, and instance status
- **Multi-language Support** - i18n with `x-custom-lang` header
- **HashiCorp Vault** - Optional secret management, syncs `.env` ([docs][ref-doc-vault])

### 🔔 Notifications

- **Multi-Channel Delivery** - Email, push, in-app, and silent notifications
- **User Preferences** - Per-type and per-channel opt-in/out settings
- **AWS SES Email Templates** - Handlebars-based email templates synced to SES
- **Firebase FCM Push** - Push notifications with multicast support and token cleanup
- **Queue-Based Processing** - Reliable async delivery with BullMQ

📖 See [Notification Documentation][ref-doc-notification] for detailed setup and usage.

### 📝 Testing & Documentation

- **Vitest Testing** - Unit specs at `test/**/*.spec.ts`, compiled through SWC. `pnpm test` does not collect coverage; `pnpm test:cov` does (100% thresholds). `.github/workflows/test.yml` runs `NODE_ENV=test pnpm test` on `workflow_dispatch`. `.github/workflows/linter.yml` runs on `pull_request`.
- **Swagger UI** - Generated from the route decorators and schemas, and written to `generated/swagger.json`
- **Detailed Docs** - 30+ documentation files covering all features, including the full [status code catalog][ref-doc-status-codes]
- **Docker Support** - `docker-compose.yml` runs PostgreSQL, Redis, BullBoard, and the JWKS server; the `apis` and `vault` profiles add the API and Vault

## Quick Start

```bash
# Clone repository
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Generate JWT keys and encryption secrets into .env
pnpm generate:secret --direct-insert

# Generate the Prisma client and src/generated/package/package.ts
pnpm generate

# Start infrastructure (PostgreSQL + Redis + BullBoard + JWKS)
docker-compose up -d

# Apply the database migrations
pnpm db:migrate

# Run the API on the host
pnpm start:dev

# Access Swagger
open http://localhost:3000/docs
```

To run the API inside Compose as well, start with the `apis` profile: `docker-compose --profile apis up -d`.

## Database

| Database | Best For | Transaction Support |
|----------|----------|---------------------|
| **PostgreSQL** | Relational Database, reliability | ✅ Yes |

**Other supported databases:** MySQL, SQLite, SQL Server, CockroachDB

**Migration typically requires:**
- Updating `prisma/schema.prisma` provider
- Adjusting ID strategy and native types when changing providers. Update the `DatabaseUtil` helpers when request ID validation changes.
- Running `pnpm db:migrate`
- Running `pnpm migration:seed`

**Business logic stays unchanged** - services, controllers, and authentication work as-is.

For detailed migration guides, see [Database Documentation][ref-doc-database].

## Installation

For detailed installation instructions (both default and Docker-based), please refer to the [Installation][ref-doc-installation].

## License

This project is licensed under the [MIT License][ref-ack-license].

## Contribute

Contributions are welcome. [CONTRIBUTING.md][ref-doc-contributing] describes how to get started.

## Contact

**Andre Christi Kan**  
📧 [andrechristikan@gmail.com][ref-author-email]

[![Github][github-shield]][ref-author-github]
[![LinkedIn][linkedin-shield]][ref-author-linkedin]

### Support This Project

If you find this project helpful and would like to support its development, please consider giving it a ⭐ **star** on GitHub or buying me a ☕ **coffee**!

**Buy me a coffee** ☕

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href='https://ko-fi.com/andrechristikan' target='_blank'>
    <img src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' alt='Buy Me a Coffee at ko-fi.com' width='200'/>
  </a>
</div>

**Or support via PayPal** 💳

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href='https://www.paypal.me/andrechristikan' target='_blank'>
    <img src='https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg' alt='Donate with PayPal' />
  </a>
</div>


<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[postgresql-shield]: https://img.shields.io/badge/PostgreSQL-white?style=for-the-badge&logo=postgresql&logoColor=4169E1
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[vitest-shield]: https://img.shields.io/badge/-vitest-%236E9F18?style=for-the-badge&logo=vitest&logoColor=white
[pnpm-shield]: https://img.shields.io/badge/pnpm-%232C8EBB.svg?style=for-the-badge&logo=pnpm&logoColor=white&color=F9AD00
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-prisma]: https://www.prisma.io
[ref-postgresql]: https://www.postgresql.org/docs/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-pnpm]: https://pnpm.io
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-vitest]: https://vitest.dev/guide/

<!-- DOCS LINKS -->

[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-notification]: docs/notification.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
[ref-doc-presign]: docs/presign.md
[ref-doc-term-policy]: docs/term-policy.md
[ref-doc-two-factor]: docs/two-factor.md
[ref-doc-vault]: docs/vault.md
[ref-doc-contributing]: CONTRIBUTING.md
[ref-doc-doc]: docs/doc.md
[ref-doc-workspace]: docs/workspace.md
[ref-doc-project]: docs/project.md
[ref-doc-analytic]: docs/analytic.md
[ref-doc-status-codes]: docs/status-codes.md
