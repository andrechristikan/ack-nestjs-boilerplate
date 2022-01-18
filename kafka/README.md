<div id="top"></div>

# Kafka Documentation

> Jump to [section remove KafkaModules](#remove-kafkamodules)

Kafka documentation is optional and just in case if we want to use kafka.

## Prerequisites

Alright, we need to know some knowledge before next section.

* Follow and understood [README  Documentation](../README.md)
* Understood [Kafka Fundamental](kafka-url). It will help we to know how kafka works and why we need kafka in real project

## Build With

Main Packages and Main Tools

* [NestJs-Microservice](nestjs-microservice-url) v8.2.5
* [KafkaJs](kafka-js-url) v1.15.0
* [Kafka](kafka-url) v3.0.0

## Getting start

We need to install [Kafka Apache](kafka-url) before we start

> NOTE : For Windows User, **do not install kafka on your Windows OS**. There are has a unsolved issue, while delete topic on Windows OS. [See this issue for more information](kafka-issue)
>
> Recommendation, Install Kafka with Virtual machine or [Docker](docker-compose.yml)

### Make sure we don't get any error after installation

```sh
kafka-topics --version

# will return 
# 3.0.0 (Commit:8cb0a5e9d3441962
```

### Installation

1. Install dependencies `@nestjs/microservices` and `kafkajs`

    ```sh
    yarn add @nestjs/microservices kafkajs
    ```

2. Our environment will be a little different. We will use `kafka/.env.example`, [Click here to see details](.env.example)

    Replace the env file with env file root dir

    ```sh
    cp kafka/.env.example .env
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

    KAFKA_ACTIVE=true
    KAFKA_CONSUMER_GROUP=nestjs.ack
    KAFKA_BROKERS=localhost:9092
    ```

    As we mention in `Readme` at section `Features`, we can switch kafka on/of. We just need change value `KAFKA_ACTIVE` in `.env` file. This useful when you don't need kafka anymore after implementation and don't want to remove it.

    > NOTE: Kafka will inactive if `APP_ENV` value is `testing` or if `KAFKA_ACTIVE` is `false`

    ```env
    ...
    ...

    AUTH_BASIC_TOKEN_CLIENT_SECRET=1234567890

    KAFKA_ACTIVE=true # <<<<----- change this
    KAFKA_CONSUMER_GROUP=nestjs.ack
    KAFKA_BROKERS=localhost:9092

    ...
    ...
    ...
    ```

3. Copy `.env.key`

    ```sh
    cp .env.key.example .env.key
    ```

    and then we need to adjust with our env

    ```env
    AUTH_JWT_ACCESS_TOKEN_SECRET_KEY=123456
    AUTH_JWT_REFRESH_TOKEN_SECRET_KEY=01001231

    AUTH_BASIC_TOKEN_CLIENT_ID=asdzxc
    AUTH_BASIC_TOKEN_CLIENT_SECRET=1234567890

    AWS_BUCKET_CREATE_FROM_INIT=false
    AWS_CREDENTIAL_KEY=
    AWS_CREDENTIAL_SECRET=
    AWS_S3_REGION=us-east-2
    AWS_S3_BUCKET=acks3
    ```

4. In `src/main.ts`, Add This Code below `app.listen(port, host)`.

    ```ts
    // src/main.ts

    ...
    ...
    ...

    const env: string = configService.get<string>('app.env');

    await app.listen(port, host);
    
    // Kafka
    await kafka(app, logger);
    

    ...
    ...
    ...

    ```

5. In `src/app/app.module.ts`, we need to import `RouterKafkaModule`, and `add RouterKafkaModule into RouterModule`.

    - `RouterKafkaModule` use to import all `Kafka**Module`.
        - `KafkaAdminModule` use to create custom kafka topics.
        - `KafkaProducerModule` use to produce message to some topic
        - `KafkaConsumerModule` consume for topics.

    - `RouterModule` use to rewrite the url prefix

        ```ts
        // src/app/app.module.ts

        ...
        ...
        ...

        import { RouterKafkaModule } from 'src/kafka/router/kafka.router.module';
        import { RouterModule } from '@nestjs/core';

        @Module({
        controllers: [],
        providers: [],
        imports: [
            ...
            ...
            ...

            
            
            // Kafka
            RouterKafkaModule.register({
                env: process.env.APP_ENV,
                active: process.env.KAFKA_ACTIVE === 'true' || false,
            }),
            RouterModule.register([
                ...
                ...
                ...

                {
                    path: '/kafka',
                    module: RouterKafkaModule,
                },
            ]),

            ...
            ...
            ...
        ]
        })
        export class AppModule {}

        ```

6. Configuration. `Partition default value is 3` or we can change value of Partition in config file `src/config/kafka.config.ts`, and `Replication Factor` default value is `count of our brokers`.

    ```ts
    // src/config/kafka.config.ts

    import { registerAs } from '@nestjs/config';

    export default registerAs(
        'kafka',
        (): Record<string, any> => ({
            brokers: process.env.KAFKA_BROKERS
                ? process.env.KAFKA_BROKERS.split(',')
                : ['localhost:9092'],
            consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'nestjs.ack',
            clientId: 'KAFKA_ACK_CLIENT_ID',

            admin: {
                clientId: 'KAFKA_ADMIN_ACK_CLIENT_ID',
                defaultPartition: 3 // <<<---- change this value
            }
        })
    );

    ```

7. Make sure our topics was created or we can use auto create topics with `KafkaAdminModule`.

    ```ts
    // src/kafka/kafka.constant.ts

    export const KAFKA_TOPICS = [
        'nestjs.ack.success', // <<<---- Add for auto create topics
        'nestjs.ack.error'
    ]; 

    ```

8. After all configuration, we need to test manual hit `/api/kafka/producer` endpoint. [see this instruction](../README.md#endpoint).

### Run project

Run project with yarn

```sh
yarn start:dev
```

### Run with Docker

This Instruction will little bit difference

> `docker-compose.yml` FILE WILL DIFFERENT BETWEEN `kafka` and `non kafka`. The file will put in `kafka/docker-compose.yml`. [Click here to see details](docker-compose.yml)

1. Before we start, we need to install `docker` and `docker compose`.

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

3. We will use `kafka/.env.docker`, [Click here to see details](.env.docker)

    Replace the env file with env file root dir

    ```sh
    yes | cp -rf .env.docker .env
    ```

    and then we need to adjust with our env

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

    KAFKA_ACTIVE=true
    KAFKA_CONSUMER_GROUP=nestjs.ack
    KAFKA_BROKERS=kafka:9092-2
    AWS_S3_BUCKET=acks3
    ```

4. Copy `.env.key`

    ```sh
    cp .env.key.example .env.key
    ```

    and then we need to adjust with our env

    ```env
    AUTH_JWT_ACCESS_TOKEN_SECRET_KEY=123456
    AUTH_JWT_REFRESH_TOKEN_SECRET_KEY=01001231

    AUTH_BASIC_TOKEN_CLIENT_ID=asdzxc
    AUTH_BASIC_TOKEN_CLIENT_SECRET=1234567890

    AWS_BUCKET_CREATE_FROM_INIT=false
    AWS_CREDENTIAL_KEY=
    AWS_CREDENTIAL_SECRET=
    AWS_S3_REGION=us-east-2
    AWS_S3_BUCKET=acks3

5. Run docker compose

    ```sh
    docker-compose -f docker/docker-compose.kafka.yml up -d
    ```

## Usage

We will cover this section in next update, but if you want to read the source code

- [KafkaAdminModule](../src/kafka/admin/)
- [KafkaProducerModule](../src/kafka/producer/)
- [KafkaConsumerModule](../src/kafka/consumer/)
## Remove KafkaModules

1. Delete `kafka folder` in `src/kafka`

2. Delete `kafka config` in `src/config/kafka.config.ts`,

3. Remove kafka config in `src/config/index.ts`.

    ```ts
    // src/config/index.ts

    import AppConfig from 'src/config/app.config';
    import AuthConfig from 'src/config/auth.config';
    import DatabaseConfig from 'src/config/database.config';
    import HelperConfig from 'src/config/helper.config';
    import MiddlewareConfig from 'src/config/middleware.config';
    import AwsConfig from 'src/config/aws.config';
    import UserConfig from './user.config';

    export default [
        AppConfig,
        AuthConfig,
        DatabaseConfig,
        HelperConfig,
        MiddlewareConfig,
        AwsConfig,
        UserConfig
    ];
    ```

4. Remove dependencies

    After we remove KafkaModules, we need to make sure that dependencies also removed too.
    The dependencies is `@nestjs/microservices` and `kafkajs`

    ```sh
    yarn remove @nestjs/microservices kafkajs
    ```

<p align="right"><a href="#top">back to top</a></p>

[nestjs-microservice-url]: https://docs.nestjs.com/microservices/kafka
[kafka-js-url]: https://kafka.js.org/docs/getting-started
[kafka-url]: https://kafka.apache.org/quickstart
[kafka-issue]: https://issues.apache.org/jira/browse/KAFKA-1194