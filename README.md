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

# ACK NestJs Boilerplate  🔥 🚀

> This repo will representative of authentication service and authorization service

[ACK NestJs][ack] is a [Http NestJs v10.x][ref-nestjs] boilerplate. Best uses for backend service.

*You can [request feature][ack-issues] or [report bug][ack-issues] with following this link*

## Table of contents

- [ACK NestJs Boilerplate  🔥 🚀](#ack-nestjs-boilerplate---)
  - [Table of contents](#table-of-contents)
  - [Important](#important)
  - [Todo](#todo)
  - [Prerequisites](#prerequisites)
  - [Build with](#build-with)
  - [Objective](#objective)
  - [Features](#features)
    - [Main Features](#main-features)
    - [Database](#database)
    - [Security](#security)
    - [Setting](#setting)
    - [Others](#others)
  - [Third Party Integration](#third-party-integration)
  - [Installation](#installation)
  - [Swagger](#swagger)
  - [License](#license)
  - [Contribute](#contribute)
  - [Contact](#contact)

## Important

> Very limited documentation

* There have been some breaking changes between v5 and v6.
* The features will be relate with AWS / Amazon web service
* Stateless Authorization
* Must run MongoDB as a `replication set` for `database transactions`.
* If you want to implement `Google SSO`. You must have google cloud console account, then create your own Credential to get the  `clientId` and `clientSecret`.
* If you want to implement `Apple SSO`. You must have `clientId` and `signInClientId`.
* If you change the environment value of `APP_ENV` to `production`, that will trigger.
    1. CorsMiddleware will implement config from `src/configs/middleware.config.ts`.
    2. Documentation will `disable`.
    3. Global prefix will remove. Before is `/api`.
* For monitoring, this project will use `sentry.io`, and only send `500` or `internal server error`.

## Todo

* [x] Refactor to version 6, more straightforward
* [x] Add message remaining
* [ ] Refactor unit test
* [ ] Update Documentation, add behaviors
* [ ] Update Documentation, and include an diagram for easier comprehension
* [ ] Add Redis
* [ ] Move to stateful Authorization Token (security and ux reason)
* [ ] Implement GraphQL, just an options for running ?

## Prerequisites

We assume that everyone who comes here is **`programmer with intermediate knowledge`** and we also need to understand more before we begin in order to reduce the knowledge gap.

1. Understand [NestJs Fundamental][ref-nestjs], Main Framework. NodeJs Framework with support fully TypeScript.
2. Understand [Typescript Fundamental][ref-typescript], Programming Language. It will help us to write and read the code.
3. Understand [ExpressJs Fundamental][ref-nodejs], NodeJs Base Framework. It will help us in understanding how the NestJs Framework works.
4. Understand what and how database works, especially NoSql and [MongoDB.][ref-mongodb]
5. Understand Repository Design Pattern or Data Access Object Design Pattern. It will help to read, and write the source code
6. Understand The SOLID Principle and KISS Principle for better write the code.
7. Optional. Understand Microservice Architecture, Clean Architecture, and/or Hexagonal Architecture. It can help you to understand more deep about this project.
8. Optional. Understanding [The Twelve Factor Apps][ref-12factor]. It can help to serve the project.
9. Optional. Understanding [Docker][ref-docker].

## Build with

Describes which version.

| Name       | Version  |
| ---------- | -------- |
| NestJs     | v10.x     |
| NestJs Swagger | v7.x |
| NodeJs     | v20.x    |
| Typescript | v5.x     |
| Mongoose   | v10.x     |
| MongoDB    | v7.x     |
| Yarn       | v1.x     |
| NPM        | v10.x     |
| Docker     | v24.x    |
| Docker Compose | v2.x |


## Objective

* Easy to maintenance
* NestJs Habit
* Component based / modular folder structure
* Stateless authentication and authorization
* Repository Design Pattern or Data Access Layer Design Pattern
* Follow Community Guide Line
* Follow The Twelve-Factor App
* Adopt SOLID and KISS principle
* Support for Microservice Architecture, Serverless Architecture, Clean Architecture, and/or Hexagonal Architecture

## Features

### Main Features

* NestJs 10.x 🥳
* Typescript 🚀
* Production ready 🔥
* Repository Design Pattern (Multi Repository, can mix with other orm)
* Swagger / OpenAPI 3 included
* Authentication (`Access Token`, `Refresh Token`, `API Key`, `Google SSO`, `Apple SSO`)
* Authorization, Role Management.
* Support multi-language `i18n` 🗣, can controllable with request header `x-custom-lang`
* Request validation for all request params, query, dan body with `class-validation`
* Serialization with `class-transformer`
* Url Versioning, default version is `1`
* Server Side Pagination
* Import and export data with CSV or Excel by using `decorator`
* Sentry.io for Monitoring Tools

### Database

* MongoDB integrate by using [mongoose][ref-mongoose] 🎉
* Multi Database
* Database Transaction
* Database Soft Delete
* Database Migration


### Security

* Apply `helmet`, `cors`, and `throttler`
* Timeout awareness and can override ⌛️

### Setting

* Support environment file
* Centralize configuration 🤖
* Centralize response structure
* Centralize exception filter
* Setting from database 🗿

### Others

* Support Docker installation
* Support CI/CD (Eg: Github Action) 
* Husky GitHook for run linter before commit 🐶
* Linter with EsLint for Typescript


## Third Party Integration

* AWS S3
* AWS SES
* AWS EC2
* AWC ECS (ongoing)
* Sentry.io
* Google SSO
* Apple SSO

## Installation

Installation will describe in difference doc. [here][doc-installation].

## Swagger

You can check The Swagger after running this project. Url `localhost:3000/docs` and don't for get to put `x-api-key` on header.

## License

Distributed under [MIT licensed][license].

## Contribute

How to contribute in this repo

1. Fork the repository
2. Create your branch (git checkout -b my-branch)
3. Commit any changes to your branch
4. Push your changes to your remote branch
5. Open a pull request

If your code behind commit with the original / main / master branch, please update your code and resolve the conflict.

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

<!-- documentation -->
[doc-installation]: /docs/installation.md

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

