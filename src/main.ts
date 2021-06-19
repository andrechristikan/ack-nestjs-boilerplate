import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { DATABASE_HOST, DATABASE_NAME } from './database/database.constant';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: true,
        bodyParser: true
    });
    const configService = app.get(ConfigService);
    const host: string = configService.get<string>('APP_HOST') || 'localhost';
    const port: number = configService.get<number>('APP_PORT') || 3000;
    const databaseHost: string =
        configService.get<string>('DATABASE_HOST') || DATABASE_HOST;
    const databaseName: string =
        configService.get<string>('DATABASE_NAME') || DATABASE_NAME;

    const logger = new Logger();

    // Global Prefix
    app.setGlobalPrefix('/api');

    await app.listen(port, host, () => {
        logger.log(
            `Database running on ${databaseHost}/${databaseName}`,
            'NestApplication'
        );
        logger.log(
            `Server running on http://${host}:${port}`,
            'NestApplication'
        );
    });
}
bootstrap();
