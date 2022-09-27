import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { Callback, Context, Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { Logger, VersioningType } from '@nestjs/common';
import swaggerInit from './swagger';

let cachedServer: Handler;

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const databaseOptionsService: DatabaseOptionsService = app.get(
        DatabaseOptionsService
    );
    const databaseUri: string =
        databaseOptionsService.createMongooseOptions().uri;
    const env: string = configService.get<string>('app.env');
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
    await swaggerInit(app);

    // Listen
    await app.init();

    logger.log(`==========================================================`);

    logger.log(`Environment Variable`, 'NestApplication');
    logger.log(JSON.parse(JSON.stringify(process.env)), 'NestApplication');

    logger.log(`==========================================================`);

    logger.log(`Database uri ${databaseUri}`, 'NestApplication');

    logger.log(`==========================================================`);

    const expressApp = app.getHttpAdapter().getInstance();
    return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
    event: any,
    context: Context,
    callback: Callback
) => {
    if (!cachedServer) {
        cachedServer = await bootstrap();
    }
    return cachedServer(event, context, callback);
};
