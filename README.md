[![Contributors][ack-contributors-shield]][ack-contributors]
[![Forks][ack-forks-shield]][ack-forks]
[![Stargazers][ack-stars-shield]][ack-stars]
[![Issues][ack-issues-shield]][ack-issues]
[![MIT License][ack-license-shield]][license]

[![NestJs][nestjs-shield]][ref-nestjs]
[![NodeJs][nodejs-shield]][ref-nodejs]
[![Typescript][typescript-shield]][ref-typescript]
[![MongoDB][mongodb-shield]][ref-mongodb]
[![JWT][jwt-shield]][ref-jwt]
[![Jest][jest-shield]][ref-jest]
[![Yarn][yarn-shield]][ref-yarn]
[![Docker][docker-shield]][ref-docker]

# ACK NestJs Boilerplate 🔥 🚀

> This repo will representative of authentication service and authorization service

[ACK NestJs][ack] is a [Http NestJs v11.x][ref-nestjs] boilerplate. Best uses for backend service.

_You can [request feature][ack-issues] or [report bug][ack-issues] with following this link_

## Table of contents

- [ACK NestJs Boilerplate 🔥 🚀](#ack-nestjs-boilerplate--)
  - [Table of contents](#table-of-contents)
  - [Important](#important)
  - [TODO](#todo)
  - [Support me](#support-me)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
    - [Main Features](#main-features)
  - [Installation](#installation)
  - [Migration](#migration)
  - [License](#license)
  - [Contribute](#contribute)
  - [Contact](#contact)

## Important

-   Stateful Authorization, using `redis-session` and `JWT`.
-   Must run MongoDB as a `replication set` for `database transactions`.
-   If you change the environment value of `APP_ENV` to `production`, it will disable Documentation.
-   For monitoring, this project will use `sentry.io`, and sent unhandled error and/or `internal server error`.
-   Since version `7.4.0`, the project uses the `ES512` algorithm for JWT authentication.
-   When using multiple protection decorators, they must be applied in the correct order:
    ```typescript
    @ExampleDoc()
    @PolicyAbilityProtected({...})
    @PolicyRoleProtected(...)
    @UserProtected()     
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/some-endpoint')
    ```

## TODO

- [ ] Improve eslint rule for better code quality (high priority, in v8)
- [ ] Move some function in service layer into repository module, because a bit wrong implementation (high priority, in v8
- [ ] 2FA Feats (high priority, in v8)
- [ ] Reset password (medium priority, in v8)
- [ ] Export Module in Background using bullmq (medium priority, in v8)
- [ ] Unit test (medium priority)
- [ ] Add Github SSO (low priority)
- [ ] Privacy Policy Module (versioning, lowest priority)
- [ ] Term and Condition Module (versioning, lowest priority)

## Support me

If you find this project helpful and would like to support its development, you can buy me a coffee

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href='https://ko-fi.com/andrechristikan' target='_blank'>
    <img src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' alt='Buy Me a Coffee at ko-fi.com' width='200'/>
  </a>
</div>

or support via PayPal

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href='https://www.paypal.me/andrechristikan' target='_blank'>
    <img src='https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg' alt='Donate with PayPal' />
  </a>
</div>

## Prerequisites

I assume that everyone who comes here is a **`programmer with intermediate knowledge`**. To get the most out of this project, here's what you should understand:

1. [NestJs Fundamentals][ref-nestjs], as the main Framework. A NodeJs Framework with full TypeScript support.
2. [Typescript Fundamentals][ref-typescript], as the main Programming Language. This will help you read and write the code.
3. [ExpressJs Fundamentals][ref-nodejs], as the base NodeJs Framework. This will help you understand how the NestJs Framework works.
4. Understanding of databases, especially NoSQL and [MongoDB][ref-mongodb].
5. Repository Design Pattern or Data Access Object Design Pattern. This will help in reading and writing the source code.
6. The SOLID Principle for better code writing.
7. Optional. Microservice Architecture. This can help you understand this project more deeply.
8. Optional. [The Twelve Factor Apps][ref-12factor]. This can help with project deployment.
9. Optional. [Docker][ref-docker].

## Build with

The project is built using the following technologies and versions:

| Name           | Version  |
| -------------- | -------- |
| NestJs         | v11.x    |
| NestJs Swagger | v11.0.x  |
| Node           | v22.13.x |
| Typescript     | v5.8.x   |
| Mongoose       | v8.12.x  |
| MongoDB        | v8.x     |
| Yarn           | v1.22.x  |
| Docker         | v27.4.x  |
| Docker Compose | v2.31.x  |

## Objective

-   Easy to maintenance
-   NestJs Habit
-   Component based / modular folder structure
-   Stateful authentication and authorization
-   Repository Design Pattern
-   Follow Community Guide Line
-   Follow The Twelve-Factor App

## Features

### Main Features

-   NestJs 11.x 🥳
-   Typescript 🚀
-   Production ready 🔥
-   MongoDB integrate by using [mongoose][ref-mongoose] 🎉
-   Cached response with redis.
-   Queue bullmq with redis.
-   Logger with pino 🌲
-   SWC (Speedy Web Compiler) Compiler, fast compiler.
-   Authorization, Role, and session Management (can revoke).
-   Repository Design Pattern.
-   Authentication (`Access Token`, `Refresh Token`, `API Key`, `Google SSO`, `Apple SSO`)
-   Export data with CSV or Excel by using `decorator`.
-   Support multi-language `i18n` 🗣, can controllable with request header `x-custom-lang`
-   Request validation for all request params, query, dan body with `class-validation`
-   Swagger / OpenAPI 3 included.
-   Url Versioning, default version is `1`.
-   Server Side Pagination.
-   Sentry.io for Monitoring Tools.
-   Support Docker installation.
-   Husky GitHook for run linter before commit 🐶.
-   Linter with EsLint for Typescript.

## Installation

For detailed installation instructions (both standard and Docker-based), please refer to the [Installation](docs/installation.md).

## Migration

The project includes a migration system for populating the database with initial data using `nestjs-command`. Migration functions include:

- Seeding default API keys, countries, roles, and users
- Managing email templates for the notification system
- Commands for adding or removing seed data

For complete documentation and instructions on using migrations, see the [Migration](docs/migration.md).

## License

Distributed under [MIT licensed][license].

## Contribute

I welcome contributions to this project! To contribute, follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/your-feature-name`.
5. Open a pull request.

Please ensure your code follows the project's coding standards and includes appropriate tests.

If your branch is behind the `origin/main` branch, please update your branch and resolve any conflicts before opening a pull request.

## Contact

[Andre Christi kan][author-email]

[![Github][github-shield]][author-github]
[![LinkedIn][linkedin-shield]][author-linkedin]


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
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[author-linkedin]: https://linkedin.com/in/andrechristikan
[author-email]: mailto:andrechristikan@gmail.com
[author-github]: https://github.com/andrechristikan
[author-paypal]: https://www.paypal.me/andrechristikan
[author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors

<!-- license -->

[license]: LICENSE.md

<!-- Reference -->

[ref-nestjs]: http://nestjs.com
[ref-mongoose]: https://mongoosejs.com
[ref-mongodb]: https://docs.mongodb.com/
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-nestjscommand]: https://gitlab.com/aa900031/nestjs-command
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-redis]: https://redis.io
