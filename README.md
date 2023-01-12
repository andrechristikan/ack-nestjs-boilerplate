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

[ACK NestJs][ack] is a [Http NestJs v9.x][ref-nestjs] boilerplate. Best uses for backend service.

*You can [request feature][ack-issues] or [report bug][ack-issues] with following this link*

## Other Repo

* [Mini Version][ack-mongoose] : Mini version
* [Typeorm Integration][ack-typeorm] : Typeorm integration `(Outdated)`
* [Kafka Integration][ack-kafka] : Hybrid Between HTTP and Microservice (Apache Kafka Integration)

## Table of contents

* [Important](#important)
* [Next Todo](#next-todo)
* [Build With](#build-with)
* [Objective](#objective)
* [Features](#features)
* [Structure](#structure)
    * [Folder Structure](#folder-structure)
    * [Module Structure](#module-structure)
    * [Response Structure](#response-structure)
* [Prerequisites](#prerequisites)
* [Getting Started](#getting-started)
    * [Clone Repo](#clone-repo)
    * [Install Dependencies](#install-dependencies)
    * [Create environment](#create-environment)
    * [Database Migration](#database-migration)
    * [Test](#test)
    * [Run Project](#run-project)
    * [Run Project with Docker](#run-project-with-docker)
* [API Reference](#api-reference)
* [Environment](#environment)
* [Api Key Encryption](#api-key-encryption)
* [Adjust Mongoose Setting](#adjust-mongoose-setting)
* [License](#license)
* [Contact](#contact)

## Important

* The features will replated with AWS Features
* If you want to implement `database transactions`, you must run MongoDB as a `replication set`.
* If you change the environment value of `APP_ENV` to `production`, that will trigger.
    1. CorsMiddleware will implement `src/configs/middleware.config.ts`.
    2. Documentation will `disable`.

## Next Todo

Next development

* Validation guard change to pipe
* [ ] SSO
    * [ ] Google
    * [ ] Apple
    * [ ] Microsoft
    * [ ] Facebook
    * [ ] Twitter
* [ ] Update Documentation, include an diagram for easier comprehension

## Build with

Describes which version.

| Name       | Version  |
| ---------- | -------- |
| NestJs     | v9.2.x     |
| NodeJs     | v18.12.x    |
| Typescript | v4.9.x     |
| Mongoose   | v6.8.x     |
| MongoDB    | v6.0.x     |
| Yarn       | v1.22.x     |
| NPM        | v8.19.x     |
| Docker     | v20.10.x    |
| Docker Compose | v2.6.x |
| Swagger | v6.1.x |

## Objective

* Easy to maintenance
* NestJs Habit
* Component based folder structure
* Repository Design Pattern or Data Access Layer Design Pattern
* Support Microservice Architecture, Serverless Architecture, Clean Architecture, and/or Hexagonal Architecture
* Follow Community Guide Line
* Follow The Twelve-Factor App
* Adopt SOLID and KISS principle

## Features

### Main Features

* NestJs v9.x 🥳
* Typescript 🚀
* Production ready 🔥
* Repository Design Pattern
* Swagger included
* Authentication (`Access Token`, `Refresh Token`, `API Key`)
* Authorization, Role and Permission Management (`PermissionToken`)
* Support multi-language `i18n` 🗣
* Request validation with `class-validation`
* Serialization with `class-transformer`
* Url Versioning
* Server Side Pagination, there have 3 of types
* Import and export data with excel by using `decorator`

### Database

* MongoDB integrate by using [mongoose][ref-mongoose] 🎉
* Multi Database
* Database Transaction
* Database Soft Delete
* Database Migration

### Logger and Debugger

* Logger with `Morgan`
* Debugger with `Winston` 📝

### Security

* Apply `helmet`, `cors`, and `rate-limit`
* Timeout awareness and can override ⌛️
* User agent awareness, and can whitelist user agent

### Setting

* Support environment file
* Centralize configuration 🤖
* Centralize response
* Centralize exception filter
* Setting from database 🗿
* Maintenance mode on / off from database 🐤

### Third Party Integration

* Storage integration with `AwsS3`
* Upload file `single` and `multipart` to AwsS3

### Others

* Support Docker Installation
* Support CI/CD with Github Action or Jenkins
* Husky GitHook For Check Source Code, and Run Test Before Commit 🐶
* Linter with EsLint for Typescript

## Structure

### Folder Structure

1. `/app` The final wrapper module
2. `/common` The common module
3. `/configs` The configurations for this project
4. `/health` health check module for every service integrated
5. `/jobs` cron job or schedule task
6. `/language` json languages
7. `/migration` migrate all init data for test the project
8. `/modules` other modules based on service/project
9. `/router` endpoint router. `Controller` will put in this

### Module structure

Full structure of module

```txt
.
└── module1
    ├── abstracts
    ├── constants // constant like enum, static value, status code, etc
    ├── controllers // business logic for rest api
    ├── decorators // warper decorator, custom decorator, etc
    ├── dtos // request validation
    ├── docs // swagger
    ├── errors // custom error
    ├── filters // custom filter 
    ├── guards // validate related with database
    ├── indicators // custom health check indicator
    ├── interceptors // custom interceptors
    ├── interfaces
    ├── middleware
    ├── pipes
    ├── repository
        ├── entities // database entities
        ├── repositories // database repositories
        └── module1.repository.module.ts
    ├── serializations // response serialization
    ├── services
    ├── tasks // task for cron job
    └── module1.module.ts
```

### Response Structure

This section will describe the structure of the response.

#### Response Metadata

This is useful when we need to give the frontend some information that is not related to the endpoint.

```ts
export interface IResponseMetadata {
    languages: ENUM_MESSAGE_LANGUAGE[];
    timestamp: number;
    timezone: string;
    requestId: string;
    path: string;
    version: string;
    repoVersion: string;
    nextPage?: string;
    previousPage?: string;
    firstPage?: string;
    lastPage?: string;
    [key: string]: any;
}
```

#### Response Default

Default response for the response

```ts
export class ResponseDefaultSerialization {
    statusCode: number;
    message: string;
    _metadata?: IResponseMetadata;
    data?: Record<string, any>;
}
```

#### Response Paging

Default response for pagination.

```ts
export class ResponsePagingSerialization {
    statusCode: number;
    message: string;
    totalData: number;
    totalPage?: number;
    currentPage?: number;
    perPage?: number;
    _availableSearch?: string[];
    _availableSort?: string[];
    _metadata?: IResponseMetadata;
    data: Record<string, any>[];
}

```

## Prerequisites

We assume that everyone who comes here is **`programmer with intermediate knowledge`** and we also need to understand more before we begin in order to reduce the knowledge gap.

1. Understand [NestJs Fundamental][ref-nestjs], Main Framework. NodeJs Framework with support fully TypeScript.
2. Understand[Typescript Fundamental][ref-typescript], Programming Language. It will help us to write and read the code.
3. Understand [ExpressJs Fundamental][ref-nodejs], NodeJs Base Framework. It will help us in understanding how the NestJs Framework works.
4. Understand what NoSql is and how it works as a database, especially [MongoDB.][ref-mongodb]
5. Understand Repository Design Pattern or Data Access Object Design Pattern. It will help to read, and write the source code
6. Understand The SOLID Principle and KISS Principle for better write the code.
7. Optional. Understand Microservice Architecture, Clean Architecture, and/or Hexagonal Architecture. It can help to serve the project.
8. Optional. Understanding [The Twelve Factor Apps][ref-12factor]. It can help to serve the project.
9. Optional. Understanding [Docker][ref-docker]. It can help to run the project.

## Getting Started

Before start, we need to install some packages and tools.
The recommended version is the LTS version for every tool and package.

> Make sure to check that the tools have been installed successfully.

1. [NodeJs][ref-nodejs]
2. [MongoDB][ref-mongodb]
3. [Yarn][ref-yarn]
4. [Git][ref-git]

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

To know the details, you can read the documentation. [Jump to document section](#documentation)

### Database Migration

> The migration will do data seeding to MongoDB. Make sure to check the value of the `DATABASE_` prefix in your`.env` file.

The Database migration used [NestJs-Command][ref-nestjscommand]

For seeding

```bash
yarn seed
```

For remove all data do

```bash
yarn rollback
```

### Test

> The test is still not good net. I'm still lazy too do that.

The project provide 3 automation testing `unit testing`, `integration testing`, and `e2e testing`.

```bash
yarn test
```

For specific test do this

* Unit testing

    ```bash
    yarn test:unit
    ```

* Integration testing

    ```bash
    yarn test:integration
    ```

* E2E testing

    ```bash
    yarn test:e2e
    ```

### Run Project

Finally, Cheers 🍻🍻 !!! you passed all steps.

Now you can run the project.

```bash
yarn start:dev
```

### Run Project with Docker

For docker installation, we need more tools to be installed in our instance.

1. [Docker][ref-docker]
2. [Docker-Compose][ref-dockercompose]

Then run

```bash
docker-compose up -d
```

## API Reference

You can check The Api Spec in [here][api-reference-docs]

## Documentation

Read documentation [here][docs].

## Adjust Mongoose Setting

> Optional, if your mongodb version is < 5

Go to file `src/common/database/services/database.options.service.ts` and add `useMongoClient` to `mongooseOptions` then set value to `true`.

```typescript
const mongooseOptions: MongooseModuleOptions = {
    uri,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    useMongoClient: true
};
```

## License

Distributed under [MIT licensed][license].

## Contribute

How to contribute in this repo

1. Fork the project with click `Fork` button of this repo.
2. Clone the fork project

    ```bash
    git clone "url you just copied"
    ```

3. Make necessary changes and commit those changes
4. Commit the changes

    ```bash
    git commit -m "your message"
    ```

5. Push changes to fork project

    ```bash
    git push origin -u main
    ```

6. Back to browser, goto your fork repo github. Then, click `Compare & pull request`

If your code behind commit with the original, please update your code and resolve the conflict. Then, repeat from number 6.

### Rule

* Avoid Circular Dependency
* Consume component folder structure, and repository design pattern
* Always make `service` for every module is independently.
* Do not put `controller` into service modules, cause this will break the dependency. Only put the controller into `router` and then inject the dependency.
* Put the config in `/configs` folder, and for dynamic config put as `environment variable`
* `CommonModule` only for main package, and put the module that related of service/project into `/src/modules`. So, if we want to clear the unnecessary module, we just need to delete the `src/modules/**`
* If there a new service in CommonModule. Make sure to create the unit test in `/test/unit`.
* If there a new controller, make sure to create the e2e testing in `test/e2e`

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
[author-email]: mailto:ack@baibay.id
[author-github]: https://github.com/andrechristikan

<!-- Repo LINKS -->
[ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors

<!-- Other Repo Links -->
[ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ack-typeorm]: https://github.com/andrechristikan/nestjs-boilerplate-typeorm
[ack-mongoose]: https://github.com/andrechristikan/ack-nestjs-boilerplate-mongoose
[ack-kafka]: https://github.com/andrechristikan/ack-nestjs-boilerplate-kafka

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

<!-- API Reference -->
[api-reference-docs]: http://localhost:3000/docs
[docs]: https://successful-stove-847.notion.site/Ack-docs-572d9a8db1c040bea8a0eb4c35054fd9
