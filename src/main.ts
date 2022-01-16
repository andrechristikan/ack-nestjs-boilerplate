import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');
    const tz: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const versioning: boolean = configService.get<boolean>('app.versioning');

    const logger = new Logger();
    process.env.TZ = tz;
    process.env.NODE_ENV = env;

    // Global Prefix
    app.setGlobalPrefix('/api');

    // Versioning
    if (versioning) {
        app.enableVersioning({
            type: VersioningType.URI,
        });
    }

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
    logger.log(
        `App Versioning is ${versioning ? 'on' : 'off'}`,
        'NestApplication'
    );
    logger.log(`Server running on ${await app.getUrl()}`, 'NestApplication');
}
bootstrap();
