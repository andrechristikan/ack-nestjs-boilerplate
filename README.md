<div id="top"></div>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

[![NestJs][nestjs-shield]][nestjs-url]
[![NodeJs][nodejs-shield]][nodejs-url]
[![Typescript][typescript-shield]][typescript-url]
[![MongoDB][mongodb-shield]][mongodb-url]
[![JWT][jwt-shield]][jwt-url]
[![Jest][jest-shield]][jest-url]
[![Yarn][yarn-shield]][yarn-url]
[![Kafka][kafka-shield]][kafka-url]
[![Docker][docker-shield]][docker-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>

  <h3 align="center">ACK NestJs Boilerplate 🚀🚀🚀 </h3>

  <p align="center">
	Boilerplate with <a href="https://github.com/goldbergyoni/nodebestpractices"><strong>Mongoose</strong></a> and <a href="https://github.com/goldbergyoni/nodebestpractices"><strong>MongoDB</strong></a> as Database. 
	<br /> 
	Made with following <a href="https://github.com/goldbergyoni/nodebestpractices"><strong>nodejs-best-practice</strong></a> as benchmark and NestJs Habit.
    <br />
    <br />
    <a href="https://github.com/andrechristikan/ack-nestjs-mongoose/blob/main/USAGE.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/andrechristikan/ack-nestjs-mongoose">View Source</a>
    ·
    <a href="https://github.com/andrechristikan/ack-nestjs-mongoose/issues">Report Bug</a>
    ·
    <a href="https://github.com/andrechristikan/ack-nestjs-mongoose/issues">Request Feature</a>
  </p>
</div>

<br />


<div align="center">
	<hr>
	<h1> ###### IMPORTANT ###### </h1>
	<h2> ##### LAST UPDATE README ON 26 DEC 2021 ( ONGOING) ##### </h2>
  <h4>There huge differences between USAGE.md Documentation and source code after KafkaModule added, <a href="https://github.com/andrechristikan/ack-nestjs-mongoose/commits/main">Click here to check</a> </h4>

  <hr>

</div>

## Description

ACK is a [NestJs](nestjs-url) boilerplate 🚀. Best uses for build an API Project or Microservice Project. Made with following [nodejs-best-practice](nodejs-bestpractice-url) as benchmark and NestJs Habit.

## Prerequisites

We assume that all people are coming to here is `Programmer with intermediate knowledge` and also we need to understanding more knowledge before we start to reduce knowledge gaps.

* Understood [ExpressJs Fundamental](expressjs-url), NodeJs Base Framework. It will help we to understand how the NestJs works.
* Understood [Typescript Fundamental](typescript-url), Programming Language. It will help we to write and read the code.
* Understood [NestJs Fundamental](nestjs-fundamental-url), Main Framework. NodeJs Framework with support fully TypeScript.
* Understand what is and how NoSql works as a Database, specially [MongoDB](#acknowledgements).

## Build With

Main packages and Main Tools

* [NestJs](nestjs-url) v8.2.4
* [NodeJs](nodejs-url) v17.3.0
* [Typescript](typescript-url) v4.5.4
* [Mongoose](mongoose-url) v6.1.3
* [NestJs-Mongoose](mongoose-url) v9.0.2
* [MongoDB](mongodb-url) v5.0.4
* [Yarn](yarn-url) v1.22.17
* [Docker](docker-url) v20.10.12
* [Docker Compose](docker-compose-url) v1.27.4

## Features

The features will spill on this section, please read secretly and keep silent 🤫 🤫

- [x] Centralize Configuration
- [x] Centralize Exception
- [x] Centralize Response
- [x] Mongoose Integration
- [x] Json Web Token Implementation
- [x] Basic Auth Implementation
- [x] Role and Permission Management
- [x] Hash Password with Bcrypt
- [x] Database Migration with Nestjs/Command
- [x] Support Multi Language
- [x] Incoming Request Validation
- [x] Logger Module, insert into Database
- [x] Debugger Module, insert into File, on/off feature.
- [x] Custom Status Code for Each Error and Success Request
- [x] Husky Git pre-commit hooks for better code
- [x] Support Docker Installation
- [x] Block User, Block Role
- [x] Remember me implementation
- [x] Manipulation Datetime, Random string, Random int, etc in HelperModule

#### Modules

- [x] AppModule - MainModule
- [x] AuthModule
- [x] AwsModule - S3 Implementation
- [x] ConfigModule - Centralize Config
- [x] DatabaseModule
- [x] DebuggerModule - write log in file
- [x] ErrorModule - Centralize Exception
- [x] Helper Module (e.g Manipulation DateTime, Random string or int, etc)
- [x] KafkaModule
    - [x] KafkaProducerModule
    - [x] KafkaConsumerModule
    - [x] KafkaAdminModule
- [x] LoggerModule - write log in database
- [x] MessageModule - Include LanguageModule
- [x] MiddlewareModule
- [x] PaginationModule
- [x] PermissionModule
- [x] RequestModule - Include RequestValidationPipe, RequestKafkaValidation
- [x] ResponseModule - Centralize Response
- [x] RoleModule
- [x] UserModule

[Welcome to request for other modules](issues-url)

#### Middleware

- [x] Rate Limit
- [x] Compression
- [x] Helmet
- [x] Cors
- [x] BodyParser

#### Example

- [x] Example Test API, and Error Test API
- [x] Example CRUD
- [x] Server Side Pagination
- [x] Request validation
- [x] Access Token
- [x] Refresh Token
- [x] Basic Auth
- [x] Login
- [x] Sign Up
- [x] Upload Image into AWS S3
- [x] Kafka Consume and Produce Message
- [x] Mongoose Population and Deep Population
- [x] Permission

#### Todo

- [x] Update version NestJs
- [ ] Unit Test and E2E Test
- [ ] Update Documentation
- [ ] Update Performance

## Endpoints

All endpoints in [endpoints.json](endpoints.json) and need import to PostMan. [Follow this step for import into Postman](postman-import-endpoint)

## Getting Start

Before we start, we need to install

- [NodeJs](nodejs-url) 
- [MongoDB](mongodb-url)
- [Yarn](yarn-url)

See their official document.

#### Make sure we don't get any error after installation

Open our terminal and follow this instruction

1. Check NodeJs is successful installed in our OS.

    ```sh
    node --version

    # will return 
    # v17.3.0
    ```

2. Check package manager is running, with yarn

    ```sh
    yarn --version

    # will return 
    # 1.22.17
    ```

    with npm

    ```sh
    npm --version

    # will return 
    # 8.3.0
    ```

3. Check MongoDB

    ```sh
    mongod --version

    # will return 
    # db version v5.0.4
    ```

#### Clone repo

```sh
git clone https://github.com/andrechristikan/ack-nestjs-mongoose
```

#### Installation

1. Install dependencies

    ```sh
    yarn
    ```

    with npm

    ```sh
    npm i
    ```

2. Build our Env based on `.env.example` file.

    ```sh
    cp .env.example .env
    ```

    and then we need to adjust with our env

    ```env
    APP_ENV=development
    APP_HOST=localhost
    APP_PORT= 3000
    APP_LANGUAGE=en
    APP_DEBUG=false
    APP_TZ=Asia/Jakarta

    DATABASE_HOST=localhost:27017
    DATABASE_NAME=ack
    DATABASE_USER=
    DATABASE_PASSWORD=
    DATABASE_ADMIN=false
    DATABASE_SRV=false
    DATABASE_DEBUG=false
    DATABASE_SSL=false
    DATABASE_OPTIONS=

    AUTH_JWT_ACCESS_TOKEN_SECRET_KEY=123456

    AUTH_JWT_REFRESH_TOKEN_SECRET_KEY=01001231

    AUTH_BASIC_TOKEN_CLIENT_ID=asdzxc
    AUTH_BASIC_TOKEN_CLIENT_SECRET=1234567890

    AWS_CREDENTIAL_KEY=awskey12345
    AWS_CREDENTIAL_SECRET=awssecret12345
    AWS_S3_REGION=us-east-2
    AWS_S3_BUCKET=acks3
    ```

3. Create Database, [follow this instruction from mongodb official](mongodb-create-database-url)

4. We need to Migration Role and Permission for first usage

    - Fresh migrate

      ```sh
      yarn migrate
      ```

      with npm

      ```sh
      npm run migrate
      ```

    - Rollback migrate

      ```sh
      yarn migrate:rollback
      ```

      with npm

      ```sh
      npm run migrate:rollback
      ```

5.  <strong> *** SKIP THIS STEP, UNIT TEST, AND E2E TEST DO NOT FINISH YET *** </strong>. 

    Make sure we do the correct step. Go run `TestModule` and make sure all test passed with success status.

    - Run Unit Testing

        ```sh
        yarn test
        ```

        with npm

        ```sh
        npm run test
        ```

    - Run E2E Testing

        ```sh
        yarn test:e2e
        ```

        with npm

        ```sh
        npm run test:e2e
        ```
6. Implement Husky

    For better code, we will consume [Husky](husky-url). This will check our code with eslint. Our code must follow eslint rule or tslint rule before commit.
    
    ```sh
    yarn prepare
    ```

#### Run project

```sh
yarn start:dev
```

with npm

```sh
npm run start:dev
```

Cheers 🍻🍻 !!! our project is running well. Now we can use all features.

Then go install or open `REST Client`. In this case, let assume we use [Postman Client](postman-url).
After installation, we need to import all endpoint into postman, [see this instruction](#endpoints).

#### Run with Docker

1. We need to install `docker` and `docker compose`.

    - Docker official Documentation, [here](docker-url)
    - Docker Compose official Documentation, [here](docker-compose-url)

2. Check `docker` is running or not

    ```sh
    docker --version

    # will return 
    # Docker version 20.10.12, build e91ed5707e
    ```

    and check `docker-compose`

    ```sh

    # will return
    # docker-compose version 1.27.4, build 40524192
    ```

3. Environment will be a little different. We will use `.env.docker`.

    ```sh
    cp .env.docker .env
    ```

    let adjust some value if necessary.

    ```env
    APP_ENV=development
    APP_HOST=0.0.0.0
    APP_PORT= 3000
    APP_LANGUAGE=en
    APP_DEBUG=false
    APP_TZ=Asia/Jakarta

    DATABASE_HOST=mongodb:27017
    DATABASE_NAME=ack
    DATABASE_USER=
    DATABASE_PASSWORD=
    DATABASE_ADMIN=false
    DATABASE_SRV=false
    DATABASE_DEBUG=false
    DATABASE_SSL=false
    DATABASE_OPTIONS=

    AUTH_JWT_ACCESS_TOKEN_SECRET_KEY=123456

    AUTH_JWT_REFRESH_TOKEN_SECRET_KEY=01001231

    AUTH_BASIC_TOKEN_CLIENT_ID=asdzxc
    AUTH_BASIC_TOKEN_CLIENT_SECRET=1234567890

    AWS_CREDENTIAL_KEY=awskey12345
    AWS_CREDENTIAL_SECRET=awssecret12345
    AWS_S3_REGION=us-east-2
    AWS_S3_BUCKET=acks3
    ```

4. Run docker compose

    ```sh
    docker-compose up -d
    ```

## Usage

Documents usage will write separate file. Document will put in [USAGE.md](USAGE.md)

## Kafka

Kafka document will write in separate file. Document will put in [KAFKA.md](KAFKA.md)

## License

Distributed under [MIT licensed](LICENSE.md).

## Contact

[Andre Christi kan](author-email)

[![Github][github-shield]][author-github]
[![LinkedIn][linkedin-shield]][author-linkedin]
[![Instagram][instagram-shield]][author-instagram]


<br />
<p align="right"><a href="#top">back to top</a></p>

<!-- BADGE LINKS -->
[contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-mongoose?style=for-the-badge
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white
[instagram-shield]: https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[aws-shield]: https://img.shields.io/badge/Amazon_AWS-{232F3E}?style=for-the-badge&logo=amazonaws&logoColor=white
[kafka-shield]: https://img.shields.io/badge/kafka-0000?style=for-the-badge&logo=apachekafka&logoColor=black&color=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white

<!-- CONTACTS -->
[author-linkedin]: https://linkedin.com/in/andrechristikan
[author-instagram]: https://www.instagram.com/___ac.k
[author-email]: mailto:andrechristikan@gmail.com
[author-github]: https://github.com/andrechristikan

<!-- GITHUB LINKS -->
[repo-url]: https://github.com/andrechristikan/ack-nestjs-mongoose
[license-url]: https://github.com/andrechristikan/ack-nestjs-mongoose/blob/main/LICENSE.md
[issues-url]: https://github.com/andrechristikan/ack-nestjs-mongoose/issues
[stars-url]: https://github.com/andrechristikan/ack-nestjs-mongoose/stargazers
[forks-url]: https://github.com/andrechristikan/ack-nestjs-mongoose/network/members
[contributors-url]: https://github.com/andrechristikan/ack-nestjs-mongoose/graphs/contributors
[history-url]: https://github.com/andrechristikan/ack-nestjs-mongoose/commits/main

<!-- NESTJS LINKS -->
[nestjs-url]: http://nestjs.com/
[nestjs-fundamental-url]: http://nestjs.com/

<!-- OTHER LINKS -->
[aws-url]: https://aws.amazon.com
[nodejs-url]: https://nodejs.org/
[bcrypt-url]: https://www.npmjs.com/package/bcrypt
[expressjs-url]: https://expressjs.com
[mongoose-url]: https://mongoosejs.com/
[mongodb-url]: https://docs.mongodb.com/
[passport-url]: https://github.com/jaredhanson/passport
[class-transformer-url]: https://github.com/typestack/class-transformer
[class-validation-url]: https://github.com/typestack/class-validator
[yarn-url]: https://yarnpkg.com
[typescript-url]: https://www.typescriptlang.org/
[jwt-url]: https://jwt.io
[postman-url]: https://www.postman.com/product/rest-client/
[postman-import-endpoint]: https://learning.postman.com/docs/getting-started/importing-and-exporting-data/
[mongodb-create-database-url]: https://www.mongodb.com/basics/create-database
[nodejs-bestpractice-url]: https://github.com/goldbergyoni/nodebestpractices
[kafka-url]: https://kafka.apache.org/quickstart
[jest-url]: https://jestjs.io/docs/getting-started
[husky-url]: https://docs.nestjs.com/microservices/kafka
[docker-url]: https://docs.docker.com
[docker-compose-url]: https://docs.docker.com/compose/
