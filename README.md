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
    - [Clone Repo](#clone-repo)
    - [Install Dependencies](#install-dependencies)
    - [Generate Keys](#generate-keys)
    - [Create Environment](#create-environment)
    - [Database Migration and Seed](#database-migration-and-seed)
    - [Template Migration](#template-migration)
    - [Run Project](#run-project)
  - [Installation with Docker](#installation-with-docker)
    - [Prerequisites](#prerequisites-1)
    - [Setup Steps](#setup-steps)
    - [Start the Application](#start-the-application)
    - [Accessing the Application](#accessing-the-application)
    - [Database Migration and Seed](#database-migration-and-seed-1)
    - [Viewing Logs](#viewing-logs)
    - [Stopping the Application](#stopping-the-application)
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

- [ ] 2FA Feats (high priority)
- [ ] Export Module in Background using bullmq (medium priority)
- [ ] Add Github SSO (low priority)
- [ ] Privacy Policy Module (versioning, lowest priority)
- [ ] Term and Condition Module (versioning, lowest priority)

## Support me

If you find this project helpful and would like to support its development, you can buy me a coffee!

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
6. The SOLID Principle and KISS Principle for better code writing.
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

Before starting, you need to install the following packages and tools.
I recommend using the LTS versions for all tools and packages.

> Always verify that the tools have been installed successfully.

1. [NodeJs][ref-nodejs] (v22.11.0 or later)
2. [MongoDB][ref-mongodb] (v8.x)
3. [Redis][ref-redis]
4. [Yarn][ref-yarn] (v1.22.22)
5. [Git][ref-git]

### Clone Repo

Clone the project with git:

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
```

### Install Dependencies

Install all required dependencies:

```bash
yarn install
```

### Generate Keys

Since version `7.4.0`, the project uses the `ES512` algorithm for JWT authentication. You need to generate both `private-key` and `public-key` pairs for access-token and refresh-token:

```bash
yarn generate:keys
```

This command will generate the necessary keys in the `/src/keys` directory, along with a `jwks.json` file that follows the JSON Web Key Set (JWKS) standard.

Upload the `jwks.json` file to AWS S3 or any publicly accessible server, and make note of the URL as you'll need it for your environment configuration.

### Create Environment

Create your environment file by copying the example:

```bash
cp .env.example .env
```

When configuring your `.env` file, pay particular attention to:
- The URL where you've hosted the `jwks.json` file
- The `kid` (Key ID) values for both access token and refresh token
- Database connection settings
- Redis configuration for caching and queues

These settings are essential for authentication and overall system functionality.

### Database Migration and Seed

By default, `AutoCreate` and `AutoIndex` options are set to `false`, meaning MongoDB schemas won't automatically update with code changes.

First, update the database schema:

```bash
yarn migrate:schema
```

Then, populate the database with initial data:

```bash
yarn migrate:seed
```

If you need to roll back the migrations:

```bash
yarn migrate:remove
```

For a complete reset and rebuild of the database:

```bash
yarn migrate:fresh
```

### Template Migration

> Optional

If you're using email templates with AWS SES:

```bash
yarn migrate:template
```

To roll back template changes:

```bash
yarn rollback:template
```

### Run Project

Now you're ready to start the project:

```bash
yarn start:dev
```

For production environments:

```bash
yarn start:prod
```

## Installation with Docker

Docker provides an easy way to set up the entire application environment with minimal configuration.

### Prerequisites

1. [Docker][ref-docker] (v27.4.x or later)
2. [Docker-Compose][ref-dockercompose] (v2.31.x or later)

### Setup Steps

Before running with Docker, you need to complete two important steps:

1. Generate JWT keys as described in the [Generate Keys](#generate-keys) section:
   ```bash
   yarn generate:keys
   ```

   When using Docker, there's no need to upload the JWKS file to an external server. The Docker setup includes a dedicated NGINX container that serves the JWKS file. After generating the keys, you should:
   
   - Make sure the `jwks.json` file is in the `/src/keys` directory
   - In your `.env` file, set `AUTH_JWT_JWKS_URI` to `http://jwks-server:3001/.well-known/jwks.json` for internal container communication
   - From outside Docker, the JWKS file will be accessible at `http://localhost:3001/.well-known/jwks.json`

2. Create and configure your environment file:
   ```bash
   cp .env.example .env
   ```
   
   When editing your `.env` file for Docker usage, ensure that:
   - Database connections point to the Docker service names (e.g., `mongodb` instead of `localhost`)
   - Redis connections point to the Docker service name (e.g., `redis` instead of `localhost`)
   - The JWKS URI is configured properly as mentioned above
   - The `kid` (Key ID) values for both access token and refresh token

### Start the Application

Run the application using Docker Compose:

```bash
docker-compose up -d
```

> **Note**: If `host.docker.internal` cannot be resolved, add a line in your `/etc/hosts` file to map `host.docker.internal` to `127.0.0.1`

### Accessing the Application

Once the containers are running, you can access:
- The main application at `http://localhost:3000`
- Swagger documentation at `http://localhost:3000/docs`
- BullMQ dashboard at `http://localhost:3010`

### Database Migration and Seed

When using Docker, you can run database migrations and seeds directly from within the app container:

```bash
# Update database schema
docker-compose exec apis yarn migrate:schema

# Populate with initial data
docker-compose exec apis yarn migrate:seed

# For a complete reset and rebuild
docker-compose exec apis yarn migrate:fresh

# To roll back migrations
docker-compose exec apis yarn migrate:remove
```

### Viewing Logs

To view logs from the running containers:

```bash
docker-compose logs -f apis
```

### Stopping the Application

To stop all services:

```bash
docker-compose down
```

To stop and remove all data volumes (this will delete your database data):

```bash
docker-compose down -v
```

## Test

The project provides unit testing capabilities:

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
