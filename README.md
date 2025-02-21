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

[ACK NestJs][ack] is a [Http NestJs v10.x][ref-nestjs] boilerplate. Best uses for backend service.

_You can [request feature][ack-issues] or [report bug][ack-issues] with following this link_

## Table of contents

- [ACK NestJs Boilerplate 🔥 🚀](#ack-nestjs-boilerplate--)
  - [Table of contents](#table-of-contents)
  - [Important](#important)
  - [TODO](#todo)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
    - [Main Features](#main-features)
  - [Installation](#installation)
    - [Clone Repo](#clone-repo)
    - [Install Dependencies](#install-dependencies)
    - [Create environment](#create-environment)
    - [Database Migration and Seed](#database-migration-and-seed)
    - [Template Migration](#template-migration)
    - [Run Project](#run-project)
  - [Installation with Docker](#installation-with-docker)
  - [Test](#test)
  - [Swagger](#swagger)
  - [API Key](#api-key)
  - [User](#user)
  - [BullMQ Board](#bullmq-board)
  - [License](#license)
  - [Contribute](#contribute)
  - [Contact](#contact)

## Important

> Very limited documentation

-   Stateful Authorization, using `redis-session` and `JWT`.
-   Must run MongoDB as a `replication set` for `database transactions`.
-   If you want to implement `Google SSO`. You must have google cloud console account, then create your own Credential to get the `clientId` and `clientSecret`.
-   If you want to implement `Apple SSO`. You must have `clientId` and `signInClientId` from apple connect.
-   If you change the environment value of `APP_ENV` to `production`, it will disable Documentation.
-   For monitoring, this project will use `sentry.io`, and sent unhandled error and/or `internal server error`.

## TODO

-   [ ] Export Module
-   [ ] Privacy Policy
-   [ ] Term and Condition

## Prerequisites

We assume that everyone who comes here is **`programmer with intermediate knowledge`** and we also need to understand more before we begin in order to reduce the knowledge gap.

1. Understand [NestJs Fundamental][ref-nestjs], Main Framework. NodeJs Framework with support fully TypeScript.
2. Understand [Typescript Fundamental][ref-typescript], Programming Language. It will help us to write and read the code.
3. Understand [ExpressJs Fundamental][ref-nodejs], NodeJs Base Framework. It will help us in understanding how the NestJs Framework works.
4. Understand what and how database works, especially NoSql and [MongoDB.][ref-mongodb]
5. Understand Repository Design Pattern or Data Access Object Design Pattern. It will help to read, and write the source code
6. Understand The SOLID Principle and KISS Principle for better write the code.
7. Optional. Understand Microservice Architecture. It can help you to understand more deep about this project.
8. Optional. Understanding [The Twelve Factor Apps][ref-12factor]. It can help to serve the project.
9. Optional. Understanding [Docker][ref-docker].

## Build with

Describes which version.

| Name           | Version  |
| -------------- | -------- |
| NestJs         | v11.x    |
| NestJs Swagger | v11.0.x  |
| Node           | v22.11.x |
| Typescript     | v5.7.x   |
| Mongoose       | v11.0.x  |
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

Before start, we need to install some packages and/or tools.
The recommended version is the LTS version for every tool and package.

> Make sure to check that tools have been installed successfully.

1. [NodeJs][ref-nodejs]
2. [MongoDB][ref-mongodb]
3. [Redis][ref-redis]
4. [Yarn][ref-yarn]
5. [Git][ref-git]

### Clone Repo

Clone the project with git.

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
```

### Install Dependencies

This project needs some dependencies. Let's go install it.

```bash
yarn install
```

### Create environment

Make your own environment file with a copy of `env.example` and adjust values to suit your own environment.

```bash
cp .env.example .env
```

### Database Migration and Seed

> By default the options of `AutoCreate` and `AutoIndex` will be `false`. Thats means the schema in MongoDb will not change with the latest update.

in the first place, you need to update the schema

```bash
yarn migrate:schema
```

After migrate the schema, also we need to run data seed

```bash
yarn migrate:seed
```

For rollback

```bash
yarn migrate:remove
```

### Template Migration

> Optional

The template migration will automatically upload `/email/templates` through AWS SES.

```bash
yarn migrate:template
```

### Run Project

Finally, Cheers 🍻🍻 !!! you passed all steps.

Now you can run the project.

```bash
yarn start:dev
```

## Installation with Docker

We need more tools to be installed.

1. [Docker][ref-docker]
2. [Docker-Compose][ref-dockercompose]

Copy `.env.example` and change value

```bash
cp .env.example .env
```

Run docker compose

> if `host.docker.internal` cannot be resolved, you must add a line in your `/etc/hosts` file to map `host.docker.internal` to the IP address `127.0.0.1`

```bash
docker-compose up -d
```

## Test

The project only provide `unit testing`.

```bash
yarn test
```

## Swagger

You can check The Swagger after running this project. Url `localhost:3000/docs`

## API Key

See it in `/migration/seeds/api-key`
The pattern is `{key}:{secret}`

## User

See it in `/migration/seeds/user`

## BullMQ Board

> This available with docker installation

You can check and monitor your queue.
Url `localhost:3010`

## License

Distributed under [MIT licensed][license].

## Contribute

How to contribute in this repo

1. Fork the repository
2. Create your branch `git checkout -b my-branch`
3. Commit any changes to your branch
4. Push your changes to your remote branch
5. Open a pull request

If your code behind commit with the `origin/main` branch, please update your code and resolve the conflict.

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

<!-- Repo LINKS -->

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
