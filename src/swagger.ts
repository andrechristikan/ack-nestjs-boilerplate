import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ENUM_APP_ENVIRONMENT } from 'src/app/constants/app.enum.constant';
import {
    AwsS3MultipartPartsSerialization,
    AwsS3MultipartSerialization,
} from 'src/common/aws/serializations/aws.s3-multipart.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { ResponseDefaultSerialization } from 'src/common/response/serializations/response.default.serialization';
import { ResponsePagingSerialization } from 'src/common/response/serializations/response.paging.serialization';
import { writeFileSync } from 'fs';

export default async function (app: NestApplication) {
    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');
    const logger = new Logger();

    const docName: string = configService.get<string>('doc.name');
    const docDesc: string = configService.get<string>('doc.description');
    const docVersion: string = configService.get<string>('doc.version');
    const docPrefix: string = configService.get<string>('doc.prefix');

    if (env !== ENUM_APP_ENVIRONMENT.PRODUCTION) {
        const documentBuild = new DocumentBuilder()
            .setTitle(docName)
            .setDescription(docDesc)
            .setVersion(docVersion)
            .addServer('/')
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'accessToken'
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'refreshToken'
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'google'
            )
            .addApiKey(
                { type: 'apiKey', in: 'header', name: 'x-api-key' },
                'apiKey'
            )
            .build();

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

        writeFileSync('./data/swagger.json', JSON.stringify(document));
        SwaggerModule.setup(docPrefix, app, document, {
            jsonDocumentUrl: `${docPrefix}/json`,
            yamlDocumentUrl: `${docPrefix}/yaml`,
            explorer: true,
            customSiteTitle: docName,
            swaggerOptions: {
                docExpansion: 'none',
                persistAuthorization: true,
                displayOperationId: true,
                operationsSorter: 'method',
                tagsSorter: 'alpha',
                tryItOutEnabled: true,
                filter: true,
                deepLinking: true,
            },
        });

        logger.log(
            `==========================================================`
        );

        logger.log(`Docs will serve on ${docPrefix}`, 'NestApplication');

        logger.log(
            `==========================================================`
        );
    }
}
