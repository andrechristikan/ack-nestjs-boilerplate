import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { MessageService } from '@common/message/services/message.service';

export default async function (app: NestApplication): Promise<void> {
    const configService = app.get(ConfigService);
    const messageService = app.get(MessageService);

    const env: string = configService.get<string>('app.env')!;
    const appName: string = configService.get<string>('app.name');
    const docName: string = configService.get<string>('doc.name')!;
    const docDesc: string = configService.get<string>('doc.description')!;
    const docVersion: string = configService.get<string>('app.version')!;
    const docPrefix: string = configService.get<string>('doc.prefix')!;
    const docUrl: string = configService.get<string>('app.url')!;
    const docAuthorName: string = configService.get<string>('app.author.name')!;
    const docAuthorEmail: string =
        configService.get<string>('app.author.email')!;

    const logger = new Logger(`${appName}-Doc`);

    if (env !== EnumAppEnvironment.production) {
        const documentBuild = new DocumentBuilder()
            .setTitle(docName)
            .setDescription(docDesc)
            .setVersion(docVersion)
            .setDescription(
                messageService.setMessage('app.description.swagger', {
                    properties: {
                        appName,
                    },
                })
            )
            .setContact(docAuthorName, docUrl, docAuthorEmail)
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
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'apple'
            )
            .addApiKey(
                { type: 'apiKey', in: 'header', name: 'x-api-key' },
                'xApiKey'
            )
            .build();

        const document = SwaggerModule.createDocument(app, documentBuild, {
            deepScanRoutes: true,
        });

        try {
            writeFileSync('src/swagger.json', JSON.stringify(document));
        } catch {}

        SwaggerModule.setup(docPrefix, app, document, {
            jsonDocumentUrl: `${docPrefix}/json`,
            explorer: true,
            customSiteTitle: docName,
            ui: env !== EnumAppEnvironment.production,
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
