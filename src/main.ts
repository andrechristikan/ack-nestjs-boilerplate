import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: true,
        bodyParser: true
    });
    const configService = app.get(ConfigService);
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const kafka: boolean = configService.get<boolean>('kafka.use');

    const logger = new Logger();
    process.env.TZ = process.env.APP_TZ;

    // Global Prefix
    app.setGlobalPrefix('/api');

    if (kafka) {
        // For kafka consumers / kafka server
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
                    allowAutoTopicCreation: false
                },
                producer: {
                    allowAutoTopicCreation: false
                }
            }
        });

        app.startAllMicroservices(async () => {
            logger.log(
                `Kafka server connected on brokers ${brokers.join(', ')}`,
                'NestApplication'
            );
        });
    }

    await app.listen(port, host, () => {
        logger.log(
            `Database running on ${configService.get<string>(
                'database.host'
            )}/${configService.get<string>('database.name')}`,
            'NestApplication'
        );
        logger.log(
            `Server running on http://${host}:${port}`,
            'NestApplication'
        );
    });
}
bootstrap();
