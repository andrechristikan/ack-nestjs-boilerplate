# Documentation

Documentation of ack-nestjs-boilerplate

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
| Nestjs Swagger | v7.x |
| NodeJs     | v18.x    |
| Typescript | v5.x     |
| Mongoose   | v7.x     |
| MongoDB    | v6.x     |
| Yarn       | v1.x     |
| NPM        | v8.x     |
| Docker     | v20.x    |
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
* Authentication (`Access Token`, `Refresh Token`, `API Key`, `Google SSO`)
* Authorization, Role Management.
* Support multi-language `i18n` 🗣, can controllable with request header `x-custom-lang`
* Request validation for all request params, query, dan body with `class-validation`
* Serialization with `class-transformer`
* Url Versioning, default version is `1`
* Server Side Pagination
* Import and export data with CSV or Excel by using `decorator`
* Sentry.io for Monitoring Tools
* Debugger with `Winston` 📝

### Database

* MongoDB integrate by using [mongoose][ref-mongoose] 🎉
* Multi Database
* Database Transaction
* Database Soft Delete
* Database Migration


### Security

* Apply `helmet`, `cors`, and `throttler`
* Timeout awareness and can override ⌛️
* User agent awareness, and can whitelist user agent

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
* AWC ECS
* Sentry.io
* Google

## Installation

Installation will describe in difference doc. [here][doc-installation].

## API Spec

You can check The API Spec after running this project. Url `localhost:3000/docs`.


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
