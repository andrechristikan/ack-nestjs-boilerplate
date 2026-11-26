[![Contributors][ack-contributors-shield]][ref-ack-contributors] [![Forks][ack-forks-shield]][ref-ack-forks] [![Stargazers][ack-stars-shield]][ref-ack-stars] [![Issues][ack-issues-shield]][ref-ack-issues] [![MIT License][ack-license-shield]][ref-ack-license]

[![NestJs][nestjs-shield]][ref-nestjs] [![NodeJs][nodejs-shield]][ref-nodejs] [![Typescript][typescript-shield]][ref-typescript] [![MongoDB][mongodb-shield]][ref-mongodb] [![JWT][jwt-shield]][ref-jwt] [![Vitest][vitest-shield]][ref-vitest] [![PNPM][pnpm-shield]][ref-pnpm] [![Docker][docker-shield]][ref-docker]

# ACK NestJs Boilerplate

[ACK NestJs][ref-ack] is a [NestJs v12.x][ref-nestjs] boilerplate with JWT, Google and Apple sign-in, MFA (TOTP and passkeys), and RBAC. It runs Prisma on MongoDB (replica set required), uses native ESM, and stays modular with a repository layer for data access.

_[Request a feature][ref-ack-issues] or [report a bug][ref-ack-issues]._

## Ideal For

A good fit when you are building:

- Enterprise apps: auth with roles, CASL policies, and an activity log
- Auth services: JWT, Google and Apple sign-in, and MFA
- Mobile backends: a REST API with social login, device tracking, and push notifications
- Multi-tenant SaaS: every user belongs to a workspace, and projects stay workspace-scoped, with invites and join requests
- Startup MVPs: auth, workspaces, notifications, and file upload already wired

## Table of Contents

- [ACK NestJs Boilerplate](#ack-nestjs-boilerplate)
    - [Ideal For](#ideal-for)
    - [Table of Contents](#table-of-contents)
    - [Important](#important)
    - [TODO](#todo)
        - [Next Features](#next-features)
    - [Prerequisites](#prerequisites)
    - [Build with](#build-with)
    - [Objective](#objective)
    - [Features](#features)
    - [Quick Start](#quick-start)
    - [Database](#database)
    - [Release](#release)
    - [License](#license)
    - [Contribute](#contribute)
    - [Contributors](#contributors)
    - [Contact](#contact)
        - [Support This Project](#support-this-project)

## Important

- MongoDB runs as a replica set because Prisma transactions need one: [Dependencies][ref-doc-dependencies].
- AWS S3, AWS SES, Firebase, Google and Apple sign-in, and Sentry are optional, and a blank `.env` line leaves one unset: [Integration triggers][ref-doc-integration-triggers].
- A route carries only the protection decorators it needs, in a fixed order: [Authorization][ref-doc-authorization].
- Swagger and the settings of a deployed environment: [Production][ref-doc-production].

## TODO

- [ ] Move to PostgreSQL
- [ ] Move to a monorepo (backend application and a separate documentation website)
- [ ] Publish the documentation website with Fumadocs, API reference rendered from the OpenAPI document

### Next Features

- [ ] Login with Github SSO
- [ ] Mobile number verification by WhatsApp and/or SMS
- [ ] Versioning System (force the frontend to update, especially mobile)

## Prerequisites

You will get more out of this project if you already know:

1. [NestJs Fundamentals][ref-nestjs]: decorators, modules, services, and dependency injection
2. [TypeScript][ref-typescript]: strong typing, interfaces, and generics
3. [Prisma ORM][ref-prisma]: schema design, `prisma db push`, and type-safe queries
4. [MongoDB][ref-mongodb]: NoSQL basics, especially replica sets for transactions
5. [Redis][ref-redis]: caching, session storage, and queues
6. Repository Design Pattern: keeping data access behind a clear layer
7. SOLID Principles: clean architecture and dependencies
8. Queue Systems: background jobs with [BullMQ][ref-bullmq]
9. [Docker][ref-docker] (optional): handy for running the local stack

## Build with

Versions this project expects:

| Name           | Version                                      |
| -------------- | -------------------------------------------- |
| NestJs         | v12.x                                        |
| NodeJs         | 26.13.x+                                     |
| PNPM           | 12.5.x+                                      |
| TypeScript     | 6.0.x+                                       |
| Prisma         | 6.19.x+                                      |
| MongoDB        | 8.0.x+ replica set (compose: `mongo:latest`) |
| Redis          | 6.2.x+ (compose: `redis:latest`)             |
| Docker         | 28.5.x+                                      |
| Docker Compose | 2.40.x+                                      |

See [package.json][ref-package-json] for the full list.

## Objective

- Modular, component-based folder structure
- Stateful authentication and authorization
- Repository Design Pattern
- Twelve-Factor App practices
- Native ESM
- Multi-workspace tenancy with workspace-scoped projects

## Features

- Identity and auth: JWT with JWKS, social sign-in, sessions, devices, MFA, and API keys
- Access control: roles, CASL policies, term-policy gating, and feature flags
- Workspace and project: mandatory multi-workspace, invites, join requests, and workspace-scoped projects
- Platform: notifications, file upload and S3 presign, activity log, analytic, i18n, health, and country data

Every feature with its pages: [Features][ref-doc-features].

## Quick Start

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate && cd ack-nestjs-boilerplate
pnpm install
pnpm generate:secret --direct-insert
```

The tutorial continues with the Docker dependencies, the schema push, the seeds, and the first run: [Installation][ref-doc-installation].

## Database

This boilerplate uses MongoDB and applies the schema with `prisma db push`, with no migration files: [Commands][ref-doc-commands] and [Database][ref-doc-database]. PostgreSQL is on the [TODO](#todo).

## Release

Releasing the application against existing services, on one Docker Compose host, or through the release workflow: [Production][ref-doc-production].

## License

[MIT License][ref-ack-license].

## Contribute

Contributions are welcome. Start with [CONTRIBUTING.md][ref-doc-contributing].

## Contributors

The contributors and the features they built: [Contributors][ref-doc-contributors].

## Contact

Andre Christi Kan [andrechristikan@gmail.com][ref-author-email]

[![Github][github-shield]][ref-author-github] [![LinkedIn][linkedin-shield]][ref-author-linkedin]

### Support This Project

If this boilerplate helped you, buy me a coffee to keep this project alive.

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href='https://ko-fi.com/andrechristikan' target='_blank'>
    <img src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' alt='Buy Me a Coffee at ko-fi.com' width='200'/>
  </a>
</div>

Or via PayPal

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

[ref-doc-features]: docs/features.md
[ref-doc-installation]: docs/getting-started/installation.md
[ref-doc-commands]: docs/reference/commands.md
[ref-doc-database]: docs/database.md
[ref-doc-dependencies]: docs/concepts/dependencies.md
[ref-doc-integration-triggers]: docs/reference/configuration.md#integration-triggers
[ref-doc-authorization]: docs/authorization.md#decorator-order
[ref-doc-production]: docs/production.md
[ref-doc-contributors]: docs/contributors.md
[ref-doc-contributing]: CONTRIBUTING.md
