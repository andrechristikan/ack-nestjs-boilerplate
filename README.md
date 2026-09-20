[![Contributors][ack-contributors-shield]][ref-ack-contributors]
[![Forks][ack-forks-shield]][ref-ack-forks]
[![Stargazers][ack-stars-shield]][ref-ack-stars]
[![Issues][ack-issues-shield]][ref-ack-issues]
[![MIT License][ack-license-shield]][ref-ack-license]

[![NestJs][nestjs-shield]][ref-nestjs]
[![NodeJs][nodejs-shield]][ref-nodejs]
[![Typescript][typescript-shield]][ref-typescript]
[![MongoDB][mongodb-shield]][ref-mongodb]
[![JWT][jwt-shield]][ref-jwt]
[![Vitest][vitest-shield]][ref-vitest]
[![PNPM][pnpm-shield]][ref-pnpm]
[![Docker][docker-shield]][ref-docker]

# ACK NestJs Boilerplate 🔥 🚀

[ACK NestJs][ref-ack] is a [NestJs v12.x][ref-nestjs] boilerplate with JWT, OAuth (Google & Apple), TOTP/2FA, and RBAC. It runs Prisma on **MongoDB** (replica set required), uses native ESM, and stays modular with a repository layer for data access.

_[Request a feature][ref-ack-issues] or [report a bug][ref-ack-issues]._

### Ideal For

A good fit when you are building:

- 🏢 **Enterprise apps** - Auth with roles, CASL policies, and an activity log
- 🔐 **Auth services** - JWT, Google and Apple sign-in, and TOTP 2FA
- 📱 **Mobile backends** - REST API with social login, device tracking, and push notifications
- 🌐 **Multi-tenant SaaS** - Every user belongs to a workspace; projects stay workspace-scoped, with invites and join requests
- 💼 **Startup MVPs** - Auth, workspaces, notifications, and file upload already wired


## Table of Contents

- [ACK NestJs Boilerplate 🔥 🚀](#ack-nestjs-boilerplate--)
    - [Ideal For](#ideal-for)
  - [Table of Contents](#table-of-contents)
  - [Important](#important)
  - [TODO](#todo)
    - [Next Features](#next-features)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
    - [🔐 Authentication \& Security](#-authentication--security)
    - [🌐 Workspaces \& Projects](#-workspaces--projects)
    - [📊 Database \& Storage](#-database--storage)
    - [🔔 Notifications](#-notifications)
    - [📈 Analytics](#-analytics)
    - [🩺 Monitoring](#-monitoring)
    - [🛠 Development](#-development)
  - [Quick Start](#quick-start)
  - [Database](#database)
  - [Installation](#installation)
  - [License](#license)
  - [Contribute](#contribute)
  - [Contact](#contact)
    - [Support This Project](#support-this-project)

## Important

- MongoDB must run as a replica set; Prisma transactions need it.
- When `APP_ENV` is `production`, Swagger is off, and Sentry Logs only get `warn`, `error`, and `fatal` (other environments send every level).
- Protection decorators follow a fixed stack. Use only the ones you need, and keep that relative order. Activity logging is separate: domains stage events, and a global interceptor writes them.
    ```typescript
    @Doc({ summary: '…' })
    @Response('example.get')          // or @ResponsePagination / @ResponseFile
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
    @Get('/some-endpoint')
    ```
    Nest runs the stack bottom-up, so a decorator that needs state from another one sits above it:

    - `@FeatureFlagProtected()` sits above `@AuthJwtAccessProtected()` so the flag guard can see `request.user`
    - if you flip that order, there is no user yet, `targetUserIds` is skipped, and rollout keys off the anonymous-ID header instead

    Full detail: [Authorization Documentation][ref-doc-authorization].

## TODO

- [ ] Move to PostgreSQL
- [ ] Move to a monorepo (backend application and a separate documentation website)

### Next Features

- [ ] Login with biometrics (fingerprint or face detection)
- [ ] Login with passkey
- [ ] Login with Github SSO
- [ ] Mobile number verification by WhatsApp and/or SMS
- [ ] Versioning System (force the frontend to update, especially mobile)

## Prerequisites

You will get more out of this project if you already know:

1. **[NestJs Fundamentals][ref-nestjs]** - Decorators, modules, services, and dependency injection
2. **[TypeScript][ref-typescript]** - Strong typing, interfaces, and generics
3. **[Prisma ORM][ref-prisma]** - Schema design, `prisma db push`, and type-safe queries
4. **[MongoDB][ref-mongodb]** - NoSQL basics, especially **replica sets** for transactions
5. **[Redis][ref-redis]** - Caching, session storage, and queues
6. **Repository Design Pattern** - Keeping data access behind a clear layer
7. **SOLID Principles** - Clean architecture and dependencies
8. **Queue Systems** - Background jobs with [BullMQ][ref-bullmq]
9. **[Docker][ref-docker]** (optional) - Handy for running the local stack

## Build with

Versions this project expects:

| Name           | Version  |
| -------------- | -------- |
| NestJs         | v12.x    |
| NodeJs         | >= 24.15.0 |
| PNPM           | >= 10.25.0 (pin `pnpm@12.5.1`) |
| TypeScript     | v6.0.x   |
| Prisma         | v6.19.x  |
| MongoDB        | v8+ (compose: `mongo:latest`)        |
| Redis          | v8+ (compose: `redis:latest`)   |
| Docker         | v28.5.x+ |
| Docker Compose | v2.40.x+ |

See [package.json][ref-package-json] for the full list.

## Objective

- Modular, component-based folder structure
- Stateful authentication and authorization
- Repository Design Pattern
- Twelve-Factor App practices
- Native ESM
- Multi-workspace tenancy with workspace-scoped projects

## Features

### 🔐 Authentication & Security

- **JWT + stateful sessions** - ES256 access and ES512 refresh tokens, Redis-backed sessions, and instant revocation
- **Social sign-in** - Google OAuth and Apple Sign In for mobile and web
- **TOTP 2FA** - Authenticator apps, encrypted secrets, and backup recovery codes
- **RBAC & CASL policies** - Roles and fine-grained abilities on top of workspace and project membership
- **API keys & rate limits** - `x-api-key` guards plus Redis sliding-window limits (per IP, per user, per route)

### 🌐 Workspaces & Projects

- **Multi-workspace tenancy** - Every user gets a workspace; personal by default, or the inviting workspace when they join through an invite
- **Projects inside workspaces** - Membership, invites, and join requests, with a feature flag when you want the surface off
- **Feature flags** - On/off, target users, and percentage rollout by user or anonymous ID

### 📊 Database & Storage

- **Prisma on MongoDB** - Type-safe queries with replica-set transactions
- **Redis cache** - Shared across instances, with configurable TTLs
- **AWS S3** - Presigned upload and download for public and private buckets
- **Offset & cursor pagination** - List endpoints that still feel fast as data grows

### 🔔 Notifications

- **Multi-channel delivery** - Email, push, in-app, and silent, with per-type and per-channel preferences
- **AWS SES + Firebase FCM** - Templated email and multicast push, including token cleanup
- **BullMQ workers** - Async delivery and other background jobs in the same process as the API

📖 [Notification Documentation][ref-doc-notification] covers setup and usage.

### 📈 Analytics

- **Activity log** - Domains stage user actions; a global interceptor writes them after the request settles (including actor/target pairs)
- **Analytic dashboard** - Admin metrics, anomaly and fraud reports, and current-workspace user metrics ([docs][ref-doc-analytic])

### 🩺 Monitoring

- **Sentry** - Errors, performance, and Pino logs, with credentials scrubbed before send
- **Health checks** - `/system/health` for database, AWS, third-party, and instance status

### 🛠 Development

- **NestJS 12 + TypeScript 6** - Strict mode, SWC builds, and hot reload next to a typecheck
- **OpenAPI 3.1** - Swagger UI and `generated/swagger.json` from the same route schemas (off in production)
- **Zod contracts** - Request and response shapes checked end to end
- **i18n** - Localized messages via `x-custom-lang`
- **Vitest** - Unit suite under `test/`; `pnpm test:cov` aims for full coverage
- **Lint & hooks** - ESLint (incl. security), Prettier, cspell, knip, Husky, and commitlint
- **Docker Compose** - MongoDB replica set, Redis, BullBoard, and JWKS locally; optional `apis` and `vault` profiles
- **HashiCorp Vault** - Optional secret sync into `.env` ([docs][ref-doc-vault])
- **Docs** - 30+ guides, including the [status code catalog][ref-doc-status-codes]

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

# Start infrastructure (MongoDB + Redis + BullBoard + JWKS)
docker-compose up -d

# Push the schema (MongoDB replica set must already be up)
pnpm db:migrate

# Run the API on the host
pnpm start:dev
```

Swagger UI: `http://localhost:3000/docs`.

Want the API inside Compose too? Use the `apis` profile: `docker-compose --profile apis up -d`.

## Database

This boilerplate uses **MongoDB** (`prisma/schema.prisma` `provider = "mongodb"`). Prisma transactions need a replica set.

- Schema sync: `pnpm db:migrate` (`prisma db push`)
- No `prisma migrate` history; shape changes go through `db push`
- ObjectId helpers, transactions, and seeds assume MongoDB

PostgreSQL is on the [TODO](#todo). Setup and seeding: [Database Documentation][ref-doc-database].

## Installation

Docker is the recommended setup. Step-by-step (Compose first, then Atlas + Redis if you cannot use Docker): [Installation][ref-doc-installation].

## License

[MIT License][ref-ack-license].

## Contribute

Contributions are welcome. Start with [CONTRIBUTING.md][ref-doc-contributing].

## Contact

**Andre Christi Kan**  
📧 [andrechristikan@gmail.com][ref-author-email]

[![Github][github-shield]][ref-author-github]
[![LinkedIn][linkedin-shield]][ref-author-linkedin]

### Support This Project

If this boilerplate helped you, buy me a coffee to keep this project alive.

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href='https://ko-fi.com/andrechristikan' target='_blank'>
    <img src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' alt='Buy Me a Coffee at ko-fi.com' width='200'/>
  </a>
</div>

**Or via PayPal**

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
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
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
[ref-mongodb]: https://docs.mongodb.com/
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
[ref-doc-message]: docs/language-message.md
[ref-doc-notification]: docs/notification.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
[ref-doc-term-policy]: docs/term-policy.md
[ref-doc-two-factor]: docs/two-factor.md
[ref-doc-vault]: docs/vault.md
[ref-doc-contributing]: CONTRIBUTING.md
[ref-doc-doc]: docs/doc.md
[ref-doc-workspace]: docs/workspace.md
[ref-doc-project]: docs/project.md
[ref-doc-analytic]: docs/analytic.md
[ref-doc-status-codes]: docs/status-codes.md
