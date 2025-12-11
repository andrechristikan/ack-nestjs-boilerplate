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

> This repository serves as a comprehensive authentication and authorization service boilerplate

[ACK NestJs][ref-ack] is a [NestJs v11.x][ref-nestjs] boilerplate designed for backend services.

_You can [request feature][ref-ack-issues] or [report bug][ref-ack-issues] with following this link_

## Table of contents

  - [Important](#important)
  - [TODO](#todo)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
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
    @PolicyAbilityProtected({...})
    @RoleProtected(...)
    @TermPolicyAcceptanceProtected(...)
    @UserProtected()
    @ActivityLog(...)
    @AuthJwtAccessProtected()
    @FeatureFlagProtected(...)
    @ApiKeyProtected()
    @Get('/some-endpoint')
    ```
- Since version `8.0.0`, the project uses the `ES256` algorithm for Access Token, and `ES512` for Refresh Token.
- Since version `8.0.0`, the project uses prisma for handle database.
- Since version `8.0.0`, the project uses pnpm for package manager.

## TODO

- [ ] Move fingerprint to jti
- [x] Update term and policy doc
- [x] Remove xlsx and use csv for file import and export. 

### Next Features
- [ ] Activity Log support bidirectional logging
- [ ] Add import and export endpoint (includes: direct upload and presign upload)
- [ ] 2FA with TOTP Authentication (eg: Google Authenticator)
- [ ] Recovery Codes Method
- [ ] Login with biometrics (fingerprint or face detection)
- [ ] Login with passkey
- [ ] Login with Github SSO
- [ ] Device awareness
- [ ] Verification Mobile Number
- [ ] Simple Notification System or Enchant Activity Log to be able act as notification
- [ ] Versioning System (Force frontend to update, especially mobile)

### Test
- [ ] Unit test
- [ ] Integration Test
- [ ] E2E Test
- [ ] Stress Test and Load Test For Benchmark

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

- **NestJS 11.x** - Latest framework version 🥳
- **TypeScript** - Full type safety 🚀
- **Production Ready** - Enterprise-grade architecture 🔥
- **Stateful Authorization** - Redis session with revokable tokens
- **JWT Authentication** - ES256 for Access Token, ES512 for Refresh Token
- **Role-Based Access Control (RBAC)** - Fine-grained permission system
- **Policy Management** - Flexible authorization rules and permissions
- **API Key Protection** - Secure API access control
- **Social Authentication** - Google Auth and Apple ID integration
- **Prisma ORM** - Modern type-safe database toolkit 🎉
- **MongoDB Integration** - NoSQL with transaction support
- **Redis Caching** - High-performance cache layer
- **Cache Manager** - Multi-level caching strategies
- **Background Jobs** - BullMQ queue system for async processing
- **Swagger/OpenAPI 3** - Interactive API documentation
- **API Versioning** - URL-based versioning (default v1)
- **Request Validation** - class-validator integration
- **Server-side Pagination** - Efficient data handling
- **SWC Compiler** - Lightning-fast compilation
- **Response Compression** - Optimized payload delivery
- **Rate Limiting** - Throttling and DDoS protection
- **Sentry Integration** - Error tracking and performance monitoring
- **Health Checks** - System monitoring endpoints
- **Multi-language Support** - i18n with header control (`x-custom-lang`) 🗣
- **CSV Processing** - CSV import/export capabilities
- **AWS Integration** - S3 file storage and SES email services
- **Database Seeding** - Commander-based data population
- **Repository Pattern** - Clean data access layer
- **Docker Support** - Complete containerization
- **Code Quality** - ESLint, Prettier, Husky git hooks 🐶
- **Testing Framework** - Jest with comprehensive setup
- **Dead Code Detection** - Automated cleanup tools

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
[ref-prisma]: https://www.prisma.io
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

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-audit-activity-log]: docs/audit-activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-how-to-handling-error]: docs/how-to-handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-internationalization]: docs/internationalization.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response-structure]: docs/response-structure.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md