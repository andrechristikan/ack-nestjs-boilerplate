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

[Http NestJs v9.x][ref-nestjs] boilerplate. Best uses for backend service.

*You can [request feature][ack-issues] or [report bug][ack-issues] with following this link*

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

> If you want to implement `database transactions`, you must run MongoDB as a `replication set`.

If you change the environment value of `APP_ENV` to `production`, that will trigger.

1. CorsMiddleware will implement `src/configs/middleware.config.ts`.Otherwise is `*`.
2. Documentation will `disable`.

## Next Todo

Next development

* [x] Implement Repository Design Pattern / Data Access Object Design Pattern
* [x] Swagger for API Documentation
* [x] Mongo Repository soft delete
* [x] Make it simple
* [x] Encrypt jwt payload
* [x] Optimize Unit Testing
* [x] Make serverless separate repo
* [x] Optimize Swagger
* [ ] Export to excel and Import from excel add options to background process
* [ ] SSO Google
* [ ] AuthApi Controller
* [ ] Update Documentation, include an diagram for easier comprehension
* [ ] OAuth2 Client Credentials
* [ ] Maybe will adopt [CQRS][ref-nestjs-cqrs]

## Build with

Describes which version.

| Name       | Version  |
| ---------- | -------- |
| NestJs     | v9.1.x     |
| NodeJs     | v18.4.x    |
| Typescript | v4.8.x     |
| Mongoose   | v6.6.x     |
| MongoDB    | v6.0.x     |
| Yarn       | v1.22.x     |
| NPM        | v8.12.x     |
| Docker     | v20.10.x    |
| Docker Compose | v2.6.x |
| Swagger | v6.1.x |

## Objective

* Easy to maintenance
* NestJs Habit
* Component based folder structure
* Repository Design Pattern or Data Access Layer Design Pattern
* Support Microservice Architecture, Serverless Architecture, Clean Architecture, and/or Hexagonal Architecture
* Follow The Twelve-Factor App
* Adopt SOLID and KISS principle

## Features

* NestJs v9.x 🥳
* Typescript 🚀
* Production ready 🔥
* Repository Design Pattern
* Swagger included
* Authentication and authorization (`JWT`, `API Key`) 💪
* Role management system
* Storage integration with `AwsS3`
* Upload file `single` and `multipart` to AwsS3
* Support multi-language `i18n` 🗣
* Request validation with `class-validation`
* Serialization with `class-transformer`
* Url Versioning
* Server Side Pagination, there have 3 of types
* Import and export data with excel by using `decorator`

## Database

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
    ├── pipes
    ├── repository
        ├── entities // database entities
        └── repositories // database repositories
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
export interface IResponse {
    metadata?: IResponseMetadata;
    [key: string]: any;
}
```

#### Response Paging

Default response for pagination.

```ts
export interface IResponsePaging {
    totalData: number;
    totalPage?: number;
    currentPage?: number;
    perPage?: number;
    availableSearch?: string[];
    availableSort?: string[];
    metadata?: IResponseMetadata;
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
5. [Docker][ref-docker]
6. [Docker-Compose][ref-dockercompose]

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

[Jump to details](#environment)

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

```bash
docker-compose up -d
```

## API Reference

We have already provided the API reference. To visit, [click here][api-reference-docs].

## Environment

Detail information about the environment

### APP Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| APP\_NAME | `string` | Application name |
| APP\_ENV | `string` | <ul><li>production</li><li>development</li></ul> |
| APP\_LANGUAGE | `string` | Enum languages, separator `,` |

### HTTP Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| HTTP\_HTTP\_ENABLE | `boolean` | Application Http on/off |
| HTTP\_HOST | `string` | Application host serve |
| HTTP\_PORT | `number` | Application port serve |
| HTTP\_VERSIONING\_ENABLE | `boolean` | Application url versioning on/off |
| HTTP\_VERSION | `number`  | Application url version number. When HTTP_VERSIONING_ENABLE is enabled, the application version number is used. |

### Debugger Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| DEBUGGER\_HTTP\_WRITE\_INTO\_FILE | `boolean` | Http debugger write into file |
| DEBUGGER\_HTTP\_WRITE\_INTO\_CONSOL | `boolean` | Http debugger write into console |
| DEBUGGER\_SYSTEM\_WRITE\_INTO\_FILE | `boolean` | System debugger write into file |
| DEBUGGER\_SYSTEM\_WRITE\_INTO\_CONSOLE | `boolean` | System debugger write into console |

### Middleware Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| MIDDLEWARE\_TIMESTAMP\_TOLERANCE | `string` | Tolerance timestamp and used for validate the `ApiKey`. `ms` package value |
| MIDDLEWARE\_TIMEOUT | `string` | Request timeout. `ms` package value  |

### Documentation Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| DOC\_NAME | `string` | Documentation tittle |
| DOC\_VERSION | `number` | Documentation version |

### Job Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| JOB\_ENABLE | `boolean` | Application Job or Schedule turn on/off |

### Database Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| DATABASE\_TYPE | `string` | Enum of database Type `MONGODB` or `POSTGRES` |
| DATABASE\_HOST | `string` | Mongodb URL. Support `standard url`, `replication`, or `srv` |
| DATABASE\_NAME | `string` | Database name |
| DATABASE\_USER | `string` | Database user |
| DATABASE\_PASSWORD | `string` | Database user password |
| DATABASE\_DEBUG | `boolean` | Trigger database `DEBUG` |
| DATABASE\_OPTIONS | `string` | Mongodb connect options |

### Auth JWT Access Token Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| AUTH\_JWT\_SUBJECT | `setting` | Jwt subject |
| AUTH\_JWT\_AUDIENCE | `string` | Jwt audience |
| AUTH\_JWT\_ISSUER| `string` | JWT issuer |
| AUTH\_JWT\_ACCESS\_TOKEN\_SECRET\_KEY | `string` | Secret access token, free text. |
| AUTH\_JWT\_ACCESS\_TOKEN\_EXPIRED | `string` | Expiration time for access token. `ms` package value |

### Auth JWT Encrypt Access Token Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| AUTH_JWT_ACCESS_TOKEN_ENCRYPT_KEY | `string` | Encrypt key for access token payload |
| AUTH_JWT_ACCESS_TOKEN_ENCRYPT_IV | `string` | Encrypt IV for access token payload |

### Auth JWT Refresh Token Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| AUTH\_JWT\_REFRESH\_TOKEN\_SECRET\_KEY | `string` | Secret refresh token, free text. |
| AUTH\_JWT\_REFRESH\_TOKEN\_EXPIRED | `string` | Expiration time for refresh token. `ms` package value |
| AUTH\_JWT\_REFRESH\_TOKEN\_REMEMBER\_ME\_EXPIRED | `string` | Expiration time for refresh token when remember me is checked. `ms` package value |
| AUTH\_JWT\_REFRESH\_TOKEN\_NOT\_BEFORE\_EXPIRATION | `string` | Token active for refresh token before `x` time. `ms` package value |

### Auth JWT Encrypt Refresh Token Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| AUTH_JWT_REFRESH_TOKEN_ENCRYPT_KEY | `string` | Encrypt key for refresh token payload |
| AUTH_JWT_REFRESH_TOKEN_ENCRYPT_IV | `string` | Encrypt IV for refresh token payload |

### AWS Environment

| Key | Type | Description |
| ---- | ---- | ---- |
| AWS\_CREDENTIAL\_KEY | `string` | AWS account credential key |
| AWS\_CREDENTIAL\_SECRET | `string` |  AWS account credential secret |
| AWS\_S3\_REGION | `string` | AWS S3 Region |
| AWS\_S3\_BUCKET | `string` | AWS S3 Name of Bucket |

## Api Key Encryption

> Please keep the `secret and passphrase` private.<br>

ApiKeyHashed uses `sha256` encryption, and `dataObject` encryption is `AES256`.

To do the encryption.

> The encryption process must be client-side.

1. Make sure to have value of
    * `key`: You can find the key for apiKey in the database.
    * `secret`: This value is `only generated when the apiKey is created`. After that, if you lose the secret, you need to recreate the apiKey.
    * `encryptionKey`: You can find the key for encryption in the database.
    * `passphrase`: This is IV for encrypt AES 256. This is need to be private too. Same with `secret`.

2. Concat the `key` and `secret`.

    ```typescript
    const concatApiKey = `${key}:${secret}`;
    ```

3. Encryption `concatApiKey` with `sha256`

    ```typescript
    const apiKeyHashed = this.helperHashService.sha256(concatApiKey);
    ```

4. Then create `dataObject` and put the `apiKeyHashed` into it

    ```typescript
    const timestamp: number = this.helperDateService.timestamp();
    const dataObject: IAuthApiRequestHashedData = {
        key, // from 1.key
        timestamp, // ms timestamp
        hash: apiKeyHashed, // from 3
    }
    ```

5. Encryption the `dataObject` with `AES 256`

    > These data `encryptionKey`, and `passphrase` can be find in database.

    ```typescript
    const passphrase = 'cuwakimacojulawu'; // <--- IV for encrypt AES 256
    const encryptionKey = 'opbUwdiS1FBsrDUoPgZdx';
    const apiKeyEncryption = await authApiService.encryptApiKey(
        data,
        encryptionKey,
        passphrase
    );
    ```

6. Last, combine the `key` and `apiKeyEncryption`

    ```typescript
    const xApiKey = `${key}:${apiEncryption}`;
    ```

7. Send into request. Put the `xApiKey` in request headers

    ```json
    {
        "headers": {
            "x-api-key": "${xApiKey}", // from 6.xApiKey
            "x-timestamp": "${timestamp}" // from 4.timestamp
            ...
            ...
            ...
        }
    }
    ```

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
[![Instagram][instagram-shield]][author-instagram]

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
[instagram-shield]: https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white

<!-- CONTACTS -->
[author-linkedin]: https://linkedin.com/in/andrechristikan
[author-instagram]: https://www.instagram.com/___ac.k
[author-email]: mailto:ack@baibay.id
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
[ref-nestjs-cqrs]: https://docs.nestjs.com/recipes/cqrs
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
[api-reference-docs]: http://108.137.127.177:3000/docs
