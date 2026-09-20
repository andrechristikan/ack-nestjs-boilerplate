import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { createSchema } from 'zod-openapi';
import { z } from 'zod';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { MessageService } from '@common/message/services/message.service';
import { ApiKeyDocSecurityName } from '@modules/api-key/constants/api-key.constant';
import {
    AuthJwtAccessDocSecurityName,
    AuthJwtRefreshDocSecurityName,
    AuthSocialAppleDocSecurityName,
    AuthSocialGoogleDocSecurityName,
} from '@modules/auth/constants/auth.constant';

export default async function (app: NestApplication): Promise<void> {
    const configService = app.get(ConfigService);
    const messageService = app.get(MessageService);

    const env: string = configService.get<string>('app.env')!;
    const appName: string = configService.get<string>('app.name')!;
    const appVersion: string = configService.get<string>('app.version')!;
    const appUrl: string = configService.get<string>('app.url')!;

    const appAuthorName: string = configService.get<string>('app.author.name')!;
    const appAuthorEmail: string =
        configService.get<string>('app.author.email')!;

    const docName: string = configService.get<string>('doc.name')!;
    const docVersion: string = configService.get<string>('doc.version')!;
    const docPrefix: string = configService.get<string>('doc.prefix')!;
    const docJsonUrlPattern: string =
        configService.get<string>('doc.jsonUrlPattern')!;

    const logger = new Logger(`${appName}-Doc`);

    if (env !== EnumAppEnvironment.production) {
        const documentBuild = new DocumentBuilder()
            .setTitle(docName)
            .setVersion(appVersion)
            .setOpenAPIVersion(docVersion)
            .setDescription(
                messageService.setMessage('doc.description', {
                    properties: {
                        appName,
                    },
                })
            )
            .setContact(appAuthorName, appUrl, appAuthorEmail)
            .addServer('/')
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                AuthJwtAccessDocSecurityName
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                AuthJwtRefreshDocSecurityName
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                AuthSocialGoogleDocSecurityName
            )
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                AuthSocialAppleDocSecurityName
            )
            .addApiKey(
                { type: 'apiKey', in: 'header', name: 'x-api-key' },
                ApiKeyDocSecurityName
            )
            .build();

        const document = SwaggerModule.createDocument(app, documentBuild, {
            deepScanRoutes: true,
            standardSchemaConverter: (schema, { schemaType }) =>
                createSchema(schema as z.core.$ZodType, { io: schemaType }),
        });

        try {
            writeFileSync('generated/swagger.json', JSON.stringify(document));
        } catch (err: unknown) {
            logger.warn(err, 'Failed to write swagger.json');
        }

        SwaggerModule.setup(docPrefix, app, document, {
            jsonDocumentUrl: docJsonUrlPattern.replace(
                '{docPrefix}',
                () => docPrefix
            ),
            explorer: true,
            customSiteTitle: docName,
            ui: true,
            raw: ['json'],
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

        logger.log(`Docs will serve on ${docPrefix}`, 'NestApplication');
    }
}
