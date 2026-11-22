import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { CommandFactory } from 'nest-commander';
import { Logger as LoggerPino } from 'nestjs-pino';
import { AppModule } from '@app/app.module';
import { AppBootstrapSentryFlushTimeoutInMs } from '@app/constants/app.constant';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { ConfigService } from '@nestjs/config';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MigrationModule } from '@migration/migration.module';
import { ConfigureOptions, configure } from '@configure';
import swaggerInit from '@swagger';

export async function bootstrapApplication(): Promise<void> {
    let app: NestApplication = await NestFactory.create(
        AppModule,
        ConfigureOptions
    );

    const configService = app.get(ConfigService);
    const databaseUtil = app.get(DatabaseUtil);
    const env: string = configService.get<string>('app.env')!;
    const timezone: string = configService.get<string>('app.timezone')!;
    const host: string = configService.get<string>('app.http.host')!;
    const port: number = configService.get<number>('app.http.port')!;
    const trustedProxies: string | null = configService.get<string | null>(
        'app.http.trustedProxies'
    )!;
    const globalPrefix: string = configService.get<string>('app.globalPrefix')!;
    const prefix: string = configService.get<string>(
        'app.urlVersioning.prefix'
    )!;
    const defaultVersion: string = configService.get<string>(
        'app.urlVersioning.defaultVersion'
    )!;
    const appName: string = configService.get<string>('app.name')!;
    const databaseUrl = configService.get<string>('database.url')!;
    const debugEnabled = configService.get<boolean>('database.debugEnabled')!;
    const accessLogEnabled = configService.get<boolean>(
        'logger.accessLogEnabled'
    )!;
    const enabled = configService.get<boolean>('logger.enabled')!;
    const level = configService.get<string>('logger.level')!;

    const logger = new Logger(`${appName}-Main`);

    process.env.NODE_ENV = env;
    process.env.TZ = timezone;

    app = app.enableShutdownHooks();
    app = configure(app);

    await swaggerInit(app);

    await app.listen(port, host);

    logger.log('=='.repeat(20), 'NestApplication');
    logger.log({ env }, 'App environment', 'NestApplication');
    logger.log({ appName }, 'App name', 'NestApplication');
    logger.log({ globalPrefix }, 'App global prefix', 'NestApplication');
    logger.log(
        { prefix: `/${prefix}` },
        'App versioning prefix',
        'NestApplication'
    );
    logger.log({ defaultVersion }, 'App version', 'NestApplication');
    logger.log({ timezone }, 'App timezone', 'NestApplication');
    logger.log(
        { url: `http://${host}:${port}${globalPrefix}` },
        'App URL',
        'NestApplication'
    );
    logger.log({ trustedProxies }, 'App trusted proxy', 'NestApplication');
    logger.log(
        { databaseUrl: databaseUtil.censorUrl(databaseUrl) },
        'Database url',
        'NestApplication'
    );
    logger.log({ debugEnabled }, 'Database debug enabled', 'NestApplication');
    logger.log(
        { accessLogEnabled },
        'Logger access log enabled',
        'NestApplication'
    );
    logger.log({ loggerEnabled: enabled }, 'Logger enabled', 'NestApplication');
    logger.log({ level }, 'Logger debug level', 'NestApplication');
    logger.log('=='.repeat(20), 'NestApplication');

    return;
}

export async function bootstrapMigration(): Promise<void> {
    const app = await CommandFactory.createWithoutRunning(MigrationModule, {
        abortOnError: false,
        bufferLogs: true,
        logger: ['fatal'],
        serviceErrorHandler: (error: Error): never => {
            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(
                error,
                'Running the migration command failed'
            );
        },
    });

    app.useLogger(app.get(LoggerPino));
    app.flushLogs();

    await CommandFactory.runApplication(app);

    await app.close();
    process.exit(0);
}

export async function bootstrapFailed(error: unknown): Promise<void> {
    const logger = new Logger('Bootstrap');

    logger.fatal(error);
    Logger.flush();

    Sentry.captureException(error);
    await Sentry.flush(AppBootstrapSentryFlushTimeoutInMs);

    process.exit(1);
}
