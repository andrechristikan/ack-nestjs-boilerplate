import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { Callback, Context, Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';
import { ResponsePagingSerialization } from 'src/common/response/serializations/response.paging.serialization';
import {
    AwsS3MultipartPartsSerialization,
    AwsS3MultipartSerialization,
} from 'src/common/aws/serializations/aws.s3-multipart.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';

const binaryMimeTypes: string[] = [];
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
    const docName: string = configService.get<string>('doc.name');
    const docDesc: string = configService.get<string>('doc.description');
    const docVersion: string = configService.get<string>('doc.version');
    const docPrefix: string = configService.get<string>('doc.prefix');

    if (env !== 'production') {
        const documentConfig = new DocumentBuilder()
            .setTitle(docName)
            .setDescription(docDesc)
            .setVersion(docVersion)
            .addTag("API's")
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'accessToken'
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'refreshToken'
            )
            .addApiKey(
                { type: 'apiKey', in: 'header', name: 'x-api-key' },
                'apiKey'
            );

        const documentBuild = documentConfig.build();

        const document = SwaggerModule.createDocument(app, documentBuild, {
            deepScanRoutes: true,
            extraModels: [
                ResponseDefaultSerialization,
                ResponsePagingSerialization,
                AwsS3MultipartPartsSerialization,
                AwsS3MultipartSerialization,
                AwsS3Serialization,
            ],
        });

        SwaggerModule.setup(docPrefix, app, document, {
            explorer: true,
            customSiteTitle: docName,
        });
    }

    // Listen
    await app.init();

    logger.log(`==========================================================`);

    logger.log(`Environment Variable`, 'NestApplication');
    logger.log(JSON.parse(JSON.stringify(process.env)), 'NestApplication');

    logger.log(`==========================================================`);

    logger.log(`Database uri ${databaseUri}`, 'NestApplication');
    logger.log(`Docs will serve on /${docPrefix}`, 'NestApplication');

    logger.log(`==========================================================`);

    const expressApp = app.getHttpAdapter().getInstance();
    return serverlessExpress({ app: expressApp, binaryMimeTypes });
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
