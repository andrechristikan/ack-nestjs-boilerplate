# Kafka Documentation

Kafka documentation is optional and just in case if we want to use kafka.

> Note: If we won't to use kafka, simply we can delete `kafka folder` in `src/kafka`, remove `kafka config` in `src/config/kafka.config.ts`, and don't forget to remove kafka config in `src/config/index.ts` too.

## Prerequisites

Alright, we need some adjustment for next section.

* Follow [README](README.md) Documentation.
* Understood [Kafka Fundamental](kafka-url). It will help how kafka works to maintain message.

## Build With

Main packages and Main Tools

* [NestJs-Microservice](nestjs-microservice-url) v7.6.11
* [KafkaJs](kafka-js-url) v1.15.0
* [Kafka](kafka-url) v2.8.0

## Getting start

We need to install [Kafka Apache](kafka-url) before we start. See their official document.

> NOTE : For Windows User, **do not install kafka on your Windows OS**. There are has a unsolved issue, while delete topic on Windows OS.
> Go install kafka with virtual machine or docker.

#### Make sure we don't get any error after installation

    ```sh
    kafka-topics --version

    # will return 
    # 2.8.0 (Commit:ebb1d6e21cc92130
    ```

#### Setting up the project

1. In `src/main.ts`, Add This Code below `app.listenAsync(port, host)`.

    ```ts
    // src/main.ts

    ...
    ...
    ...

    await app.listenAsync(port, host);

    const kafka = await import('./kafka/kafka');
    await kafka.default(
        app,
        configService,
        logger
    );

    ...
    ...
    ...

    ```

2. In `src/app/app.module.ts`, we need to import `KafkaAdminModule`, `KafkaProducerModule`, `KafkaConsumerModule`.

    - `KafkaAdminModule` use to create custom kafka topics.
    - `KafkaProducerModule` use to produce message to some topic
    - `KafkaConsumerModule` consume for topics, or we can called endpoint for topic.

        ```ts
        // src/app/app.module.ts

        ...
        ...
        ...

        import { KafkaAdminModule } from 'src/kafka/admin/kafka.admin.module';
        import { KafkaProducerModule } from 'src/kafka/producer/producer.module';
        import { KafkaConsumerModule } from 'src/kafka/consumer/consumer.module';

        @Module({
        controllers: [AppController],
        providers: [],
        imports: [
            ...
            ...
            ...

            SeedsModule,
            KafkaAdminModule, // <<<---- Add this
            KafkaProducerModule, // <<<---- Add this
            KafkaConsumerModule, // <<<---- Add this

            AuthModule,
            UserModule,

            ...
            ...
            ...
        ]
        })
        export class AppModule {}

        ```

3. `Partition` default value is 3 or we can set Partition in config file `src/config/kafka.config.ts`, and `Replication Factor` default value is `count of our brokers`.

    ```ts
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

4. Make sure our topics was created or we can use auto create topics with `KafkaAdminModule`.

    ```ts
    // src/kafka/kafka.constant.ts

    export const KAFKA_TOPICS = [
        'nestjs.ack.success', // <<<---- Add for auto create topics
        'nestjs.ack.error'
    ]; 

    ```

5. After all configuration, we need to test. We can test `KafkaProducerModule` and `KafkaConsumerModule` with manual hit `/kafka/produce` endpoint.


[nestjs-microservice-url]: https://docs.nestjs.com/microservices/kafka
[kafka-js-url]: https://kafka.js.org/docs/getting-started
[kafka-url]: https://kafka.apache.org/quickstart