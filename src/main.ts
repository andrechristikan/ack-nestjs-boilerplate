import './instrument';

import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer, validate } from 'class-validator';
import swaggerInit from './swagger';
import { plainToInstance } from 'class-transformer';
import { AppEnvDto } from '@app/dtos/app.env.dto';
import { MessageService } from '@common/message/services/message.service';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
    let app: NestApplication = await NestFactory.create(AppModule, {
        abortOnError: true,
        bufferLogs: true,
    });

    app.useLogger(app.get(PinoLogger));

    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env')!;
    const timezone: string = configService.get<string>('app.timezone')!;
    const host: string = configService.get<string>('app.http.host')!;
    const port: number = configService.get<number>('app.http.port')!;
    const globalPrefix: string = configService.get<string>('app.globalPrefix')!;
    const versioningPrefix: string = configService.get<string>(
        'app.urlVersion.prefix'
    )!;
    const version: string = configService.get<string>(
        'app.urlVersion.version'
    )!;
    const appName: string = configService.get<string>('app.name')!;
    const databaseUrl = configService.get<string>('database.url')!;
    const databaseDebug = configService.get<boolean>('database.debug')!;
    const loggerAuto = configService.get<boolean>('logger.auto')!;
    const loggerDebugEnable = configService.get<boolean>('logger.enable')!;
    const loggerDebugLevel = configService.get<string>('logger.level')!;

    const versionEnable: boolean = configService.get<boolean>(
        'app.urlVersion.enable'
    )!;

    process.env.NODE_ENV = env;
    process.env.TZ = timezone;

    app = app.enableShutdownHooks();

    app.setGlobalPrefix(globalPrefix);
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    const logger = new Logger(`${appName}-Main`);
    const classEnv = plainToInstance(AppEnvDto, process.env);
    const errors = await validate(classEnv, {
        skipMissingProperties: false,
        skipNullProperties: false,
        skipUndefinedProperties: false,
        validationError: {
            target: false,
            value: true,
        },
    });
    if (errors.length > 0) {
        const messageService = app.get(MessageService);
        const errorsMessage = messageService.setValidationMessage(errors);

        logger.error(errorsMessage, 'Env Variable Invalid');

        throw new Error('Env Variable Invalid', {
            cause: errorsMessage,
        });
    }

    await swaggerInit(app);

    await app.listen(port, host);

    logger.log('=='.repeat(20), 'NestApplication');
    logger.log(`App Environment: ${env}`, 'NestApplication');
    logger.log(`App Name: ${appName}`, 'NestApplication');
    logger.log(`App Global Prefix: ${globalPrefix}`, 'NestApplication');
    logger.log(
        `App Versioning Prefix: /${versioningPrefix}`,
        'NestApplication'
    );
    logger.log(`App Version: ${version}`, 'NestApplication');
    logger.log(`App Timezone: ${timezone}`, 'NestApplication');
    logger.log(
        `App URL: http://${host}:${port}${globalPrefix}`,
        'NestApplication'
    );
    const databaseHost = new URL(databaseUrl).host;
    logger.log(`Database Host: ${databaseHost}`, 'NestApplication');
    logger.log(`Database Debug: ${databaseDebug}`, 'NestApplication');
    logger.log(`Logger Auto: ${loggerAuto}`, 'NestApplication');
    logger.log(`Logger Debug Enable: ${loggerDebugEnable}`, 'NestApplication');
    logger.log(`Logger Debug Level: ${loggerDebugLevel}`, 'NestApplication');
    logger.log('=='.repeat(20), 'NestApplication');

    return;
}
bootstrap();
