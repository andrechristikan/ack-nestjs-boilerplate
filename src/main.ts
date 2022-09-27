import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import swaggerInit from './swagger';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const databaseOptionsService: DatabaseOptionsService = app.get(
        DatabaseOptionsService
    );
    const databaseUri: string =
        databaseOptionsService.createMongooseOptions().uri;
    const env: string = configService.get<string>('app.env');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const globalPrefix: string = configService.get<string>('app.globalPrefix');
    const versioning: boolean = configService.get<boolean>(
        'app.versioning.enable'
    );
    const versioningPrefix: string = configService.get<string>(
        'app.versioning.prefix'
    );
    const version: string = configService.get<string>('app.versioning.version');
    const logger = new Logger();
    process.env.NODE_ENV = env;

    // Global
    app.setGlobalPrefix(globalPrefix);
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Versioning
    if (versioning) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    // Swagger
    const docPrefix: string = configService.get<string>('doc.prefix');
    await swaggerInit(app);

    // Listen
    await app.listen(port, host);

    logger.log(`==========================================================`);

    logger.log(`Environment Variable`, 'NestApplication');
    logger.log(JSON.parse(JSON.stringify(process.env)), 'NestApplication');

    logger.log(`==========================================================`);

    logger.log(
        `Http Server running on ${await app.getUrl()}`,
        'NestApplication'
    );
    logger.log(`Database uri ${databaseUri}`, 'NestApplication');
    logger.log(
        `Docs will serve on ${await app.getUrl()}${docPrefix}`,
        'NestApplication'
    );

    logger.log(`==========================================================`);
}
bootstrap();
