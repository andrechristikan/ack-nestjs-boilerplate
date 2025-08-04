import './instrument';

import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer, validate } from 'class-validator';
import swaggerInit from 'src/swagger';
import { plainToInstance } from 'class-transformer';
import { AppEnvDto } from '@app/dtos/app.env.dto';
import { MessageService } from '@common/message/services/message.service';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
    const app: NestApplication = await NestFactory.create(AppModule, {
        abortOnError: true,
        bufferLogs: false,
    });

    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');
    const timezone: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const globalPrefix: string = configService.get<string>('app.globalPrefix');
    const versioningPrefix: string = configService.get<string>(
        'app.urlVersion.prefix'
    );
    const version: string = configService.get<string>('app.urlVersion.version');
    const appName: string = configService.get<string>('app.name');

    // enable
    const versionEnable: string = configService.get<string>(
        'app.urlVersion.enable'
    );

    process.env.NODE_ENV = env;
    process.env.TZ = timezone;

    // logger
    const logger = new Logger(`${appName}-Main`);

    app.useLogger(app.get(PinoLogger));
    app.setGlobalPrefix(globalPrefix);
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

        logger.error(
            `Env Variable Invalid: ${JSON.stringify(errorsMessage)}`,
            'NestApplication'
        );

        throw new Error('Env Variable Invalid', {
            cause: errorsMessage,
        });
    }

    // Swagger
    await swaggerInit(app);

    // Listen
    await app.listen(port, host);

    logger.log(`Http versioning is ${versionEnable}`);

    logger.log(
        `Http Server running on ${await app.getUrl()}`,
        'NestApplication'
    );

    return;
}
bootstrap();
