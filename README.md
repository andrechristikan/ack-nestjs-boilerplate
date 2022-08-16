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

# ACK NestJs Boilerplate Mongoose  🔥 🚀

> Standard architecture for nestjs

ack-nestjs-mongoose is a [NestJs](http://nestjs.com) Boilerplate with [Mongoose](https://mongoosejs.com) and [MongoDB](https://docs.mongodb.com) as Database.

Made with following
- [nodejs-best-practice](https://github.com/goldbergyoni/nodebestpractices)
- [The Twelve-Factor App](https://12factor.net)
- NestJs Habit.

*You can [Request Feature][ack-issues] or [Report Bug][ack-issues] with following this link*

## Important

> ack-nestjs-mongoose still on trial and error phase and the test will base on real projects or cases. So there will be (always) have new update and new features.

If you change env value of `APP_MODE` to `secure` that will trigger more `Middleware` and `Guard`.

1. `TimestampMiddleware`, tolerant 5 minutes of request.
2. `UserAgentMiddleware`, whitelist of user agent.
3. `ApiKeyGuard`, check api key based on database.
4. `CorsMiddleware`, check cors based on configs.

You can see our `e2e testing file` or read the documentation on [section environment][ack-doc-env].

## Build with

Describes which version .

| Name       | Version  |
| ---------- | -------- |
| NestJs     | v9.x     |
| NodeJs     | v18.x    |
| Typescript | v4.x     |
| Mongoose   | v6.x     |
| MongoDB    | v6.x     |
| Yarn       | v1.x     |
| NPM        | v8.x     |
| Docker     | v20.x    |
| Docker Compose | v2.x |

## Objective

ack-nestjs-mongoose have some objective.

- Simple, scalable and secure
- Avoid spaghetti code
- Component based
- Reusable component
- Easy to maintenance
- Support for all microservice patterns

## Features

- NestJs v9.x 🥳
- Production Ready 🔥
- Typescript 🚀
- Authentication and Authorization (JWT, OAuth2, API Key, Basic Auth, Role Management) 💪
- User Agent Check
- MongoDB Integrate by Using Mongoose Package 🎉
- Database Migration (NestJs-Command)
- Storage with AWS (S3)
- Server Side Pagination (3 Types)
- Url Versioning
- Request Validation Pipe with Custom Message 🛑
- Custom Error Status Code 🤫
- Logger (Morgan) and Debugger (Winston) 📝
- Centralize Configuration 🤖
- Centralize Exception Filter, and Custom Error Structure
- Multi-language (i18n) 🗣
- Timezone Awareness, and Custom Timezone
- Request Timeout, and Request Custom Timeout (Override) ⌛️
- Dynamic Setting from Database 🗿
- Maintenance Mode on / off 🐤
- Server Side Pagination
- Cache Manager Implementation
- Support Docker Installation
- Support CI/CD with Github Action or Jenkins
- Husky GitHook For Check Source Code, and Run Test Before Commit 🐶
- Linter with EsLint for Typescript

## Prerequisites

We assume that everyone who comes here is _**`programmer with intermediate knowledge`**_ and we also need to understand more before we begin in order to reduce the knowledge gap.

1. Understand [NestJs Fundamental](http://nestjs.com), Main Framework. NodeJs Framework with support fully TypeScript.
2. Understand[Typescript Fundamental](https://www.typescriptlang.org), Programming Language. It will help us to write and read the code.
3. Understand [ExpressJs Fundamental](https://nodejs.org), NodeJs Base Framework. It will help us in understanding how the NestJs Framework works.
4. Understand what NoSql is and how it works as a database, especially [MongoDB.](https://docs.mongodb.com)
5. Optional, Understand [Microservice Architecture](https://microservices.io) and the design pattern.
6. Optional,[The Twelve Factor Apps](https://12factor.net)
7. Optional, Understand [Docker](ref-docker) that can help you to run the project

## Todo

Next development

- [x] Import data form excel
- [x] Version 2. New folder structure, new file upload decorator
- [x] Reduce mixin usage
- [x] Upload file multiple update
- [x] File large upload into s3 for video and audio. using array of chunk
- [x] Rename repo from `ack-nestjs-boilerplate-mongoose` to `ack-nestjs-mongoose`
- [x] Message en,id
- [x] Optimize code, remove unnecessary code
- [x] Update Unit test
- [x] Update E2E test
- [x] Response Excel, convert response from controller into excel `res.send()`
- [ ] Basic Token as ApiKey
- [ ] Update Documentation

## Documentation

Before we start, we need to install some packages and tools.
Recommend version is LTS Version for every tool and package.

> Make sure check that tools has been installed successfully.

* [NodeJs](https://nodejs.org)
* [MongoDB as Replication](https://docs.mongodb.com/manual/replication/)
* [Yarn](https://yarnpkg.com)
* [Git](https://git-scm.com)


### Getting Started

#### Clone Repo

Clone ack-nestjs-mongoose with git.

```bash
git clone https://github.com/andrechristikan/ack-nestjs-mongoose
```

#### Install Dependencies

This project need some dependencies. Let's go install it.

```bash
# yarn
yarn install
```

#### Create environment

Make your own environment with copy from `.env.example` and edit some value.

```bash
cp .env.example .env
```

[Jump to details](#environment)

#### Database Migration

> If you want to to implement `transaction`, you must to install `Mongodb Replication Set`. You need to run `mongodb`. There are have so many options, you can do by your self with search on `google`.

Database migration ack-nestjs-mongoose used [NestJs-Command](https://gitlab.com/aa900031/nestjs-command)

For migrate

```bash
yarn migrate
```

For rollback

```bash
yarn rollback
```

#### Test

ack-nestjs-mongoose provide 3 automation testing `unit testing`, `integration testing`, and `e2e testing`. 

```bash
yarn test
```

#### Specific test

For unit testing

```bash
yarn test:unit
```

For integration testing

```bash
yarn test:integration
```

For E2E testing

```bash
yarn test:e2e
```

#### Run Project

> If mongodb version < 5, [Read this section for adjust mongoose setting.](#adjust-mongoose-setting)

Finally, Cheers 🍻🍻 !!! we passed all steps.

Now we can run ack-nestjs-mongoose and use all of features.

```bash
yarn start:dev
```

#### Run Project with Docker

```bash
docker-compose up -d
```


## Environment

Detail information about the environment

### APP Environment

| Key | Type | Description |
| ---- | ---- | ---- | 
| APP\_NAME | `string` | Free text | 
| APP\_ENV | `string` | <ul><li>production</li><li>development</li></ul> |
| APP\_MODE | `string` | <ul><li>secure</li><li>simple</li></ul> |
| APP\_LANGUAGE | `string` | Enum languages, separator `,` |
| APP\_TZ | `string` | Override timezone |
| APP\_HOST | `string` | Application serve | 
| APP\_PORT | `number` | Application serve | 
| APP\_DEBUG | `boolean` | All logs will write into console |
| APP\_VERSIONING | `boolean` | Application url versioning | 
| APP\_HTTP\_ON | `boolean` | Application Http turn on | 
| APP\_JOB\_ON | `boolean` | Application Job turn on | 


### Database Environment

| Key | Type | Description |
| ---- | ---- | ---- | 
| DATABASE\_HOST | `string` | Mongodb URL. Support `standard url` `replication`, and `srv` |
| DATABASE\_NAME | `string` | Database name |
| DATABASE\_USER | `string` | Database user |
| DATABASE\_PASSWORD | `string` | Database user password |
| DATABASE\_DEBUG | `boolean` | Trigger database mongoose `DEBUG` |
| DATABASE\_OPTIONS | `string` | Mongodb connect options |

### Middleware Environment

| Key | Type | Description |
| ---- | ---- | ---- | 
| MIDDLEWARE\_TOLERANCE\_TIMESTAMP  | `string` | Tolerance timestamp `ApiKey`. `ms` package value | 
| MIDDLEWARE\_TIMEOUT | `string` | Request timeout. `ms` package value  | 


### Auth Environment

| Key | Type | Description |
| ---- | ---- | ---- | 
| AUTH\_JWT\_ACCESS\_TOKEN\_SECRET\_KEY | `string` | Secret access token, free text. |
| AUTH\_JWT\_ACCESS\_TOKEN\_EXPIRED | `string` | Expiration time for access token. `ms` package value |
| AUTH\_JWT\_REFRESH\_TOKEN\_SECRET\_KEY | `string` | Secret refresh token, free text. |
| AUTH\_JWT\_REFRESH\_TOKEN\_EXPIRED | `string` | Expiration time for refresh token. `ms` package value |
| AUTH\_JWT\_REFRESH\_TOKEN\_REMEMBER\_ME\_EXPIRED | `string` | Expiration time for refresh token when remember me is checked. `ms` package value |
| AUTH\_JWT\_REFRESH\_TOKEN\_NOT\_BEFORE\_EXPIRATION | `string` | Token active for refresh token before `x` time. `ms` package value |

### Basic Environment

> Will implement as `ApiKey`

| Key | Type | Description | 
| ---- | ---- | ---- | 
| AUTH\_BASIC\_TOKEN\_CLIENT\_ID  | `string` | Free text | 
| AUTH\_BASIC\_TOKEN\_CLIENT\_SECRET | `string` | Free tex  | 

### AWS Environment

| Key | Type | Description | 
| ---- | ---- | ---- | 
| AWS\_CREDENTIAL\_KEY | `string` | AWS account credential key |
| AWS\_CREDENTIAL\_SECRET | `string` |  AWS account credential secret |
| AWS\_S3\_REGION | `string` | AWS S3 Region |
| AWS\_S3\_BUCKET | `string` | AWS S3 Name of Bucket |

## Adjust Mongoose Setting

> Just is case, if your mongodb version is < 5

Go to file `src/common/database/services/database.options.service.ts` and remove comment `useMongoClient` then set value to `true`.

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

## Contact

[Andre Christi kan][author-email]

[![Github][github-shield]][author-github]
[![LinkedIn][linkedin-shield]][author-linkedin]
[![Instagram][instagram-shield]][author-instagram]

<!-- BADGE LINKS -->
[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-mongoose?style=for-the-badge

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
[ack-repo]: https://github.com/andrechristikan/ack-nestjs-mongoose
[ack-e2e]: /e2e
[ack-issues]: https://github.com/andrechristikan/ack-nestjs-mongoose/issues
[ack-stars]: https://github.com/andrechristikan/ack-nestjs-mongoose/stargazers
[ack-forks]: https://github.com/andrechristikan/ack-nestjs-mongoose/network/members
[ack-contributors]: https://github.com/andrechristikan/ack-nestjs-mongoose/graphs/contributors
[ack-history]: https://github.com/andrechristikan/ack-nestjs-mongoose/commits/main

<!-- ack microservice -->
[ack-microservice-repo]: https://github.com/andrechristikan/ack-microservice-mongoose

<!-- license -->
[license]: LICENSE.md

<!-- Documents -->
[ack-docs]: https://andrechristikan.github.io/ack-nestjs-boilerplate-docs/

<!-- Reference -->
[ref-nestjs]: http://nestjs.com
[ref-mongoose]: https://mongoosejs.com/
[ref-mongodb]: https://docs.mongodb.com/
[ref-nodejs-best-practice]: https://github.com/goldbergyoni/nodebestpractices
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-docker]: https://docs.docker.com
[ref-yarn]: https://yarnpkg.com
[ref-postman-import-export]: https://learning.postman.com/docs/getting-started/importing-and-exporting-data/
