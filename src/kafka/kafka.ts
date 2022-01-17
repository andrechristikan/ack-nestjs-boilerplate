import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

export default async function (
    app: NestApplication,
    logger: Logger
): Promise<void> {
    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');
    const kafkaActive: boolean = configService.get<boolean>('kafka.active');

    logger.log(
        `Kafka Modules is ${kafkaActive && env !== 'testing' ? 'on' : 'off'}`,
        'NestApplication'
    );

    if (kafkaActive && env !== 'testing') {
        const brokers: string[] = configService.get<string[]>('kafka.brokers');
        const clientId: string = configService.get<string>('kafka.clientId');
        const consumerGroup: string = configService.get<string>(
            'kafka.consumerGroup'
        );

        app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.KAFKA,
            options: {
                client: {
                    clientId,
                    brokers,
                },
                consumer: {
                    groupId: consumerGroup,
                    allowAutoTopicCreation: false,
                },
                producer: {
                    allowAutoTopicCreation: false,
                },
            },
        });

        await app.startAllMicroservices();
        logger.log(
            `Kafka server connected on brokers ${brokers.join(', ')}`,
            'NestApplication'
        );
    }

    return;
}
