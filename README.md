<div id="top"></div>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][LICENSE.md]

[![NestJs][nestjs-shield]][nestjs-url]
[![NodeJs][nodejs-shield]][nodejs-url]
[![Typescript][typescript-shield]][typescript-url]
[![MongoDB][mongodb-shield]][mongodb-url]
[![JWT][jwt-shield]][jwt-url]
[![Jest][jest-shield]][jest-url]
[![Yarn][yarn-shield]][yarn-url]
[![Kafka][kafka-shield]][kafka-url]
[![Docker][docker-shield]][docker-url]

# ACK NestJs Boilerplate 🔥 🚀 

> NOTE: There will be huge differences between USAGE Documentation and Source Code
>
> Last update readme documentation on 16 Jan 2022

ACK is a [NestJs](nestjs-url) Boilerplate with [Mongoose](mongoose-url) and [MongoDB](mongodb-url) as Database. `Best uses for build an API Project or Microservice Project.` Made with following [nodejs-best-practice](nodejs-bestpractice-url) as benchmark and NestJs Habit

> KafkaModule just optional module, this can be add or remove if we don't need implement kafka, [see KAFKA Documentation](kafka/README.md)

*You can [Request Feature](issues-url) or [Report Bug](issues-url) with following this link*

## Prerequisites

We assume that all people are coming to here is `Programmer with intermediate knowledge` and also we need to understanding more knowledge before we start to reduce knowledge gaps.

* Understood [NestJs Fundamental](nestjs-fundamental-url), Main Framework. NodeJs Framework with support fully TypeScript.
* Understood [Typescript Fundamental](typescript-url), Programming Language. It will help we to write and read the code.
* Understood [ExpressJs Fundamental](expressjs-url), NodeJs Base Framework. It will help we to understand how the NestJs Framework works.
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
* [Docker](docker-url) v20.10.11
* [Docker Compose](docker-compose-url) v2.2.1

## Features

The features will spill on this section, please read secretly and keep silent

### Configuration

- [x] Centralize Configuration
- [x] Centralize Exception
- [x] Centralize Response
- [x] Versioning
- [x] Admin, Public, Common, and Test RouterModule
- [x] Validation All Incoming Request
- [x] Support Multi Language, control from header
- [x] Custom Status Code for Each Error and Success Response

### Security

- [x] Json Web Token Guard, Access Token and Refresh Token (OAuth2)
- [x] Basic Auth Guard
- [x] Password Expired Guard
- [x] Block User
- [x] Block Role Guard
- [x] Login Expired Guard
- [x] Role and Permission Management
- [x] Hash Password with Bcrypt

### Mongoose Modules

- [x] Mongoose Integration
- [x] Mongoose Populate and Deep Populate
- [x] Mongoose Transaction, `Need MongoDB as Replication Instance to use this feature`
- [x] Multi Database Connection
- [x] Database Migration with Nestjs/Command

### Logger Modules

- [x] Logger Module, insert into Database
- [x] Debugger Module, can write into file log
- [x] Http Debugger Module, catch http incoming request and write into file log

### Kafka Modules

All kafka features can switch on/off or remove, [read kafka section](#kafka)

- [x] Kafka Admin Module, Create Topics with custom partition, and custom replication
- [x] Kafka Producer Module, Store Message to Topic

### Middleware Modules

- [x] Body Parser (JSON, Raw, Test, Multipart Form, and Urlencoded)
- [x] Rate Limit
- [x] Compression
- [x] Helmet
- [x] Cors
- [x] BodyParser

### Helper Module

- [x] Manipulation Datetime
- [x] Random string, Random String Length, Random String Prefix
- [x] Random number, Random Number Between, Random OTP
- [x] JWT signature
- [x] Hashing
- [x] Encryption and Decryption

### Others

- [x] Husky Git pre-commit hooks for better code
- [x] Support Docker Installation

### Example

- [x] Example Test Simple API
- [x] Example CRUD
- [x] Server Side Pagination
- [x] Request validation
- [x] Login
- [x] Sign Up
- [x] Upload Image or File
- [x] Kafka Consume and Produce Message
- [x] Mongoose Population and Deep Population

### Todo

- [ ] Unit Test and E2E Test
- [ ] Update Usage Documentation
- [ ] Update Performance

## Endpoints

All endpoints in [endpoints.json](endpoints.json) and need import to PostMan. [Follow this step for import into Postman](postman-import-endpoint)

## Getting Start

Before we start, we need to install

- [NodeJs](nodejs-url) 
- [MongoDB](mongodb-url) `go install and set mongoDB as replication if we need to use Mongoose Transaction Features`
- [Yarn](yarn-url)

### Make sure we don't get any error after installation

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

### Clone repo

```sh
git clone https://github.com/andrechristikan/ack-nestjs-mongoose
```

### Installation

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
    APP_VERSIONING=false
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

    > NOTE: If we use mongodb < v5, we need some adjust in `src/database/database.service.ts`

    ```ts
    // src/database/database.service.ts

    ...
    ...
    ...
    mongoose.set('debug', this.debug);

    const mongooseOptions: MongooseModuleOptions = {
        uri,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useMongoClient: true  // <<<<---- uncomment this
    };


    if (this.admin) {
        mongooseOptions.authSource = 'admin';
    }
    ...
    ...
    ...
    ```

4. We need to Migration Role and Permission for first usage

    - Fresh migrate

      ```sh
      yarn migrate
      ```

      with npm

      ```sh
      npm run migrate
      ```

    - Rollback migrate, `be careful to use rollback, cause rollback will remove all data in collection`

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

### Run project

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

### Run with Docker

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
    docker-compose --version

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
    APP_VERSIONING=false
    APP_DEBUG=false
    APP_TZ=Asia/Jakarta

    DATABASE_HOST=mongodb:27017
    DATABASE_NAME=ack
    DATABASE_USER=root
    DATABASE_PASSWORD=123456
    DATABASE_ADMIN=true
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

Documents usage will write separate file. Document will put in [USAGE Documentation](USAGE.md)

## Kafka

Kafka document will write in separate file. Document will put in [KAFKA Documentation](kafka/README.md)

## License

Distributed under [MIT licensed](LICENSE.md).

## Contact

[Andre Christi kan](author-email)

[![Github][github-shield]][author-github]
[![LinkedIn][linkedin-shield]][author-linkedin]
[![Instagram][instagram-shield]][author-instagram]

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
[author-email]: mailto:ack@baibay.com
[author-github]: https://github.com/andrechristikan

<!-- GITHUB LINKS -->
[repo-url]: https://github.com/andrechristikan/ack-nestjs-mongoose
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
