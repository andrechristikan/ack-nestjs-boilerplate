import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import kafka from 'src/kafka/kafka';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule, {
        cors: true,
        bodyParser: true
    });
    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');
    const kafkaActive: boolean = configService.get<boolean>('kafka.active');
    const tz: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');

    const logger = new Logger();
    process.env.TZ = tz;
    process.env.NODE_ENV = env;

    // Global Prefix
    app.setGlobalPrefix('/api');

    // Listen
    await app.listen(port, host);
    logger.log(
        `Database running on ${configService.get<string>(
            'database.host'
        )}/${configService.get<string>('database.name')}`,
        'NestApplication'
    );
    logger.log(
        `Database options ${configService.get<string>('database.options')}`,
        'NestApplication'
    );
    logger.log(`Server running on ${await app.getUrl()}`, 'NestApplication');

    // Kafka
    if (kafkaActive && env !== 'testing') {
        await kafka(app, configService, logger);
    }
}
bootstrap();
