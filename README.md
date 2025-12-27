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
[![Jest][jest-shield]][ref-jest]
[![PNPM][pnpm-shield]][ref-pnpm]
[![Docker][docker-shield]][ref-docker]

# ACK NestJs Boilerplate 🔥 🚀

[ACK NestJs][ref-ack] is a [NestJs v11.x][ref-nestjs] boilerplate designed for backend services. Production-ready NestJS boilerplate with authentication, authorization, and enterprise features

_You can [request feature][ref-ack-issues] or [report bug][ref-ack-issues] with following this link_

### Ideal For

This boilerplate is perfect for:

- 🏢 **Enterprise Applications** - Full-featured auth system with RBAC and audit logging
- 🔐 **Authentication Services** - Ready-to-use JWT, OAuth, and 2FA implementation
- 📱 **Mobile App Backends** - RESTful API with social login support
- 🌐 **Multi-tenant SaaS** - Role-based access control and policy management
- 🚀 **Microservices** - Stateful sessions with Redis and async job processing
- 💼 **Startup MVPs** - Production-ready foundation to ship faster

## Table of contents

  - [Important](#important)
  - [TODO](#todo)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
    - [Authentication & Security](#authentication--security)
    - [Database & Storage](#database--storage)
    - [Performance & Optimization](#performance--optimization)
    - [Development Experience](#development-experience)
    - [Integrations & Monitoring](#integrations--monitoring)
    - [Testing & Documentation](#testing--documentation)
    - [Architecture Highlights](#architecture-highlights)
  - [Quick Start](#quick-start)
  - [Change DB with Minimal Effort](#change-db-with-minimal-effort)
  - [Installation](#installation)
  - [License](#license)
  - [Contribute](#contribute)
  - [Contact](#contact)

## Important

- Stateful Authorization, using `redis-session` and `JWT`.
- Must run MongoDB as a `replication set` for `database transactions`.
- If you change the environment value of `APP_ENV` to `production`, it will disable Documentation.
- When using multiple protection decorators, they must be applied in the correct order:
    ```typescript
    @ExampleDoc()
    @ActivityLog(...)
    @PolicyAbilityProtected({...})
    @RoleProtected(...)
    @TermPolicyAcceptanceProtected(...)
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected(...)
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Get('/some-endpoint')
    ```
- Since version `8.0.0`, the project uses the `ES256` algorithm for Access Token, and `ES512` for Refresh Token.
- Since version `8.0.0`, the project uses prisma `6.19` for handle database.
- Since version `8.0.0`, the project uses pnpm for package manager.

## TODO

- [x] Change enum name to use PascalCase
- [x] 2FA with TOTP Authentication (eg: Google Authenticator)
- [x] Recovery Codes Method
- [x] Add TOTP Authentication Protected to reset password, change password, and regenerate backup codes endpoints
- [x] Add import and export endpoint with presign upload
- [ ] Add migration script to migrate AWS S3 Policy for public and private, include config for presign expiration

### Next Features

- [ ] Activity Log support bidirectional logging
- [ ] Login with biometrics (fingerprint or face detection)
- [ ] Login with passkey
- [ ] Login with Github SSO
- [ ] Device awareness, Geo Location
- [ ] Sliding session (Example: 7d expires for a refresh token, can be extends until x day. if not action in 7d then need to re-login)
- [ ] Anomaly detection when refresh token
- [ ] Verification Mobile Number, whatsapp or/and sms
- [ ] Simple Notification System or Enchant Activity Log to be able act as notification
- [ ] Versioning System (Force frontend to update, especially mobile)

### Test
- [ ] Unit test
- [ ] Integration Test
- [ ] E2E Test
- [ ] Stress Test For Benchmark/Performance
- [ ] Load Test For Benchmark/Performance


## Prerequisites

I assume that everyone who comes here is a **`programmer with intermediate knowledge`**. To get the most out of this project, here's what you should understand:

1. **[NestJs Fundamentals][ref-nestjs]** - Main framework with decorators, modules, services, and dependency injection
2. **[TypeScript][ref-typescript]** - Strong typing, interfaces, generics, and advanced TypeScript features
3. **[Prisma ORM][ref-prisma]** - Modern database toolkit for schema design, migrations, and type-safe queries
4. **[MongoDB][ref-mongodb]** - NoSQL database concepts, especially **replication sets** for transactions
5. **[Redis][ref-redis]** - Caching strategies, session storage, and queue management
6. **Repository Design Pattern** - Data access layer abstraction for maintainable code
7. **SOLID Principles** - Clean code architecture and dependency management
8. **Queue Systems** - Background job processing with [BullMQ][ref-bullmq]
9. **Optional. [Docker][ref-docker]** - Containerization for running the project
10. **Optional. Microservice Architecture** - Understanding distributed systems concepts

## Build with

The project is built using the following technologies and versions. We always strive to use the latest stable versions to ensure security, performance, and access to modern features:

| Name           | Version  |
| -------------- | -------- |
| NestJs         | v11.x    |
| NodeJs         | v24.11.x |
| TypeScript     | v5.9.x   |
| Prisma         | v6.19.x  |
| MongoDB        | v8.0.x   |
| Redis          | v8.0.x   |
| Docker         | v28.5.x  |
| Docker Compose | v2.40.x  |

For more information see [package.json][ref-package-json]

## Objective

- Easy to maintain
- NestJs Habit
- Component based / modular folder structure
- Stateful authentication and authorization
- Repository Design Pattern
- Follow Community Guidelines
- Follow The Twelve-Factor App

## Features

### 🔐 Authentication & Security
Production-ready authentication system with multiple strategies and security layers.

- **JWT Authentication** - ES256 for Access Token, ES512 for Refresh Token with automatic rotation
- **Stateful Sessions** - Redis-backed sessions with token revocation support
- **Social Login** - Google OAuth and Apple Sign In integration ([docs][ref-doc-authentication])
- **Two-Factor Authentication** - TOTP-based 2FA with backup recovery codes ([docs][ref-doc-two-factor])
- **RBAC & Policies** - Fine-grained role and permission system ([docs][ref-doc-authorization])
- **API Key Protection** - Secure external API access control
- **Rate Limiting** - DDoS protection with configurable throttling
- **Security Headers** - Helmet integration for HTTP security

### 📊 Database & Storage
Modern ORM with NoSQL database and file storage capabilities.

- **Prisma ORM** - Type-safe database toolkit with migrations ([docs][ref-doc-database])
- **MongoDB** - NoSQL database with transaction support (replica set required)
- **Redis Caching** - Multi-level caching strategies for performance ([docs][ref-doc-cache])
- **AWS S3 Integration** - File storage with presigned URLs ([docs][ref-doc-file-upload])
- **Repository Pattern** - Clean separation of data access layer

### ⚡ Performance & Optimization
Built for speed and scalability from day one.

- **Background Jobs** - BullMQ queue system for async processing ([docs][ref-doc-queue])
- **Response Compression** - Automatic gzip/deflate compression
- **SWC Compiler** - 20x faster than TypeScript compiler
- **Pagination** - Server-side pagination with cursor support ([docs][ref-doc-pagination])
- **Feature Flags** - Dynamic feature rollout with A/B testing ([docs][ref-doc-feature-flag])

### 🛠 Development Experience
Developer-friendly tooling and best practices.

- **NestJS 11.x** - Latest framework version with full TypeScript support
- **Swagger/OpenAPI 3** - Interactive API documentation ([docs][ref-doc-doc])
- **API Versioning** - URL-based versioning (default v1)
- **Request Validation** - Automatic validation with class-validator ([docs][ref-doc-request-validation])
- **Error Handling** - Standardized error responses with i18n ([docs][ref-doc-handling-error])
- **Hot Reload** - Fast development with SWC
- **Code Quality** - ESLint, Prettier, Husky pre-commit hooks
- **Database Seeding** - Commander-based data population

### 📡 Integrations & Monitoring
Enterprise-grade integrations for production readiness.

- **Sentry** - Error tracking and performance monitoring ([docs][ref-doc-third-party-integration])
- **AWS SES** - Transactional email delivery
- **Activity Logging** - Comprehensive audit trail ([docs][ref-doc-activity-log])
- **Health Checks** - System monitoring endpoints
- **Multi-language Support** - i18n with `x-custom-lang` header ([docs][ref-doc-message])

### 📝 Testing & Documentation
Comprehensive testing framework and documentation.

- **Jest Testing** - Unit, integration, and e2e test setup
- **Swagger UI** - Auto-generated API documentation
- **Detailed Docs** - 20+ documentation files covering all features
- **Docker Support** - Complete containerization with docker-compose

### 🎯 Architecture Highlights

- **Repository Pattern** - Clean data access abstraction
- **SOLID Principles** - Maintainable and testable codebase  
- **Modular Structure** - Component-based folder organization
- **12-Factor App** - Cloud-native best practices
- **Production Ready** - Enterprise-grade security and scalability

## Quick Start

```bash
# Clone repository
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Run with Docker
docker-compose up -d

# Access API
open http://localhost:3000/docs
```

## Change DB with Minimal Effort

Thanks to **Repository Pattern** and **Prisma ORM**, switching databases requires minimal code changes. The abstraction layer isolates database logic from business logic.

### Supported Databases

Prisma supports multiple databases out of the box:

- 🐘 **PostgreSQL** - Recommended for production
- 🐬 **MySQL** - Popular relational database
- There are more many database

**Migration typically requires:**
- Updating `prisma/schema.prisma` provider
- Adjusting ID strategy (ObjectId → UUID)
- Running `npx prisma migrate dev`
- Running `pnpm migration:seed`

**Business logic stays unchanged** - services, controllers, and authentication work as-is.

For detailed migration guides, see [Database Documentation][ref-doc-database].

## Installation

For detailed installation instructions (both default and Docker-based), please refer to the [Installation](docs/installation.md).

## License

This project is licensed under the [MIT License][ref-ack-license].

## Contribute

We welcome contributions to this project! To contribute, follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and ensure they follow our coding standards
4. **Run tests**: `pnpm test` and `pnpm lint` to verify your changes
5. **Commit your changes**: `git commit -m 'feat: add some feature'`
6. **Push to your branch**: `git push origin feature/your-feature-name`
7. **Open a Pull Request** with a clear description of your changes

### **Contribution Guidelines**
- Follow the existing code style and conventions
- Write or update tests for any new functionality
- Ensure all tests pass before submitting
- Use conventional commit messages (feat, fix, docs, etc.)
- Keep PRs focused and atomic

If your branch is behind the `origin/main` branch, please rebase and resolve any conflicts before opening a pull request.

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
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
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
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-types]: https://docs.nestjs.com/openapi/types-and-parameters
[ref-prisma]: https://www.prisma.io
[ref-prisma-mongodb]: https://www.prisma.io/docs/orm/overview/databases/mongodb#commonalities-with-other-database-provider
[ref-prisma-setup]: https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project#switching-databases
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-pnpm]: https://pnpm.io
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

[ref-doc-root]: readme.md
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
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
[ref-doc-presign]: docs/presign.md
[ref-doc-term-policy]: docs/term-policy.md

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
