import './instrument';

import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer, validate } from 'class-validator';
import swaggerInit from 'src/swagger';
import { plainToInstance } from 'class-transformer';
import { AppEnvDto } from 'src/app/dtos/app.env.dto';
import { MessageService } from 'src/common/message/services/message.service';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import compression from 'compression';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap() {
    const app: NestApplication = await NestFactory.create(AppModule, {
        abortOnError: false,
        bufferLogs: true,
    });

    const configService = app.get(ConfigService);
    const databaseUri: string = configService.get<string>('database.uri');
    const env: string = configService.get<string>('app.env');
    const timezone: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number =
        env !== ENUM_APP_ENVIRONMENT.MIGRATION
            ? configService.get<number>('app.http.port')
            : 9999;
    const globalPrefix: string = configService.get<string>('app.globalPrefix');
    const versioningPrefix: string = configService.get<string>(
        'app.urlVersion.prefix'
    );
    const version: string = configService.get<string>('app.urlVersion.version');

    // enable
    const httpEnable: boolean = configService.get<boolean>('app.http.enable');
    const versionEnable: string = configService.get<string>(
        'app.urlVersion.enable'
    );

    const logger = new Logger('NestJs-Main');
    process.env.NODE_ENV = env;
    process.env.TZ = timezone;

    // logger
    if (env !== ENUM_APP_ENVIRONMENT.LOCAL) {
        app.useLogger(app.get(PinoLogger));
    }

    // Compression
    app.use(compression());

    // Global
    app.setGlobalPrefix(globalPrefix);

    // For Custom Validation
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Versioning
    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    // Validate Env
    const classEnv = plainToInstance(AppEnvDto, process.env);
    const errors = await validate(classEnv);
    if (errors.length > 0) {
        const messageService = app.get(MessageService);
        const errorsMessage = messageService.setValidationMessage(errors);
        logger.log(errorsMessage);

        throw new Error('Env Variable Invalid');
    }

    // Swagger
    await swaggerInit(app);

    // Listen
    await app.listen(port, host);

    logger.log(`==========================================================`);

    if (env === ENUM_APP_ENVIRONMENT.MIGRATION) {
        logger.log(`On migrate the schema`);

        logger.log(
            `==========================================================`
        );

        await new Promise(resolve => setTimeout(resolve, 5000));

        await app.close();
        process.exit(0);
    }

    logger.log(
        `Http is ${httpEnable}, ${
            httpEnable ? 'routes registered' : 'no routes registered'
        }`,
        'NestApplication'
    );
    logger.log(`Http versioning is ${versionEnable}`);

    logger.log(
        `Http Server running on ${await app.getUrl()}`,
        'NestApplication'
    );
    logger.log(`Database uri ${databaseUri}`);

    logger.log(`==========================================================`);

    return;
}
bootstrap();
