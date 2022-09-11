import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const appName: string = configService.get<string>('app.name');
    const env: string = configService.get<string>('app.env');
    const tz: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const globalPrefix: string = configService.get<string>('app.globalPrefix');
    const versioning: boolean = configService.get<boolean>('app.versioning.on');
    const versioningPrefix: string = configService.get<string>(
        'app.versioning.prefix'
    );
    const version: string = configService.get<string>('app.version');
    const logger = new Logger();
    process.env.TZ = tz;
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
        const config = new DocumentBuilder()
            .setTitle(docName)
            .setDescription(docDesc)
            .setVersion(docVersion)
            .addTag("API's")
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup(docPrefix, app, document);
    }

    // Listen
    await app.listen(port, host);

    logger.log(`==========================================================`);
    logger.log(`${appName} Environment is ${env}`, 'NestApplication');
    logger.log(
        `App Language is ${configService.get<string>('app.language')}`,
        'NestApplication'
    );
    logger.log(
        `App Debug is ${configService.get<boolean>('app.debug')}`,
        'NestApplication'
    );
    logger.log(`App Versioning is ${versioning}`, 'NestApplication');
    logger.log(
        `App Http is ${configService.get<boolean>('app.httpOn')}`,
        'NestApplication'
    );
    logger.log(
        `App Task is ${configService.get<boolean>('app.jobOn')}`,
        'NestApplication'
    );
    logger.log(`App Timezone is ${tz}`, 'NestApplication');
    logger.log(
        `Database Debug is ${configService.get<boolean>('database.debug')}`,
        'NestApplication'
    );

    logger.log(`==========================================================`);

    logger.log(`Docs will serve on ${await app.getUrl()}${docPrefix}`);
    logger.log(`Docs version is ${docVersion}`);

    logger.log(`==========================================================`);

    logger.log(
        `Database running on ${configService.get<string>(
            'database.host'
        )}/${configService.get<string>('database.name')}`,
        'NestApplication'
    );
    logger.log(`Server running on ${await app.getUrl()}`, 'NestApplication');

    logger.log(`==========================================================`);
}
bootstrap();
