import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule, {
        cors: true,
        bodyParser: true
    });
    const configService = app.get(ConfigService);
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');

    const logger = new Logger();
    process.env.TZ = process.env.APP_TZ;

    // Global Prefix
    app.setGlobalPrefix('/api');

    // Listen
    await app.listenAsync(port, host);
    logger.log(
        `Database running on ${configService.get<string>(
            'database.host'
        )}/${configService.get<string>('database.name')}`,
        'NestApplication'
    );
    logger.log(`Server running on http://${host}:${port}`, 'NestApplication');
}
bootstrap();
