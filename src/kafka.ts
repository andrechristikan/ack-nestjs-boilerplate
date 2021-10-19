import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

export default async function (
    app: NestApplication,
    configService: ConfigService,
    logger: Logger
): Promise<void> {
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
                brokers
            },
            consumer: {
                groupId: consumerGroup,
                allowAutoTopicCreation: true
            },
            producer: {
                allowAutoTopicCreation: true
            }
        }
    });

    await app.startAllMicroservicesAsync();
    logger.log(
        `Kafka server connected on brokers ${brokers.join(', ')}`,
        'NestApplication'
    );

    return;
}
