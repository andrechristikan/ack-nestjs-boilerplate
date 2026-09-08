import './instrument';

import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import swaggerInit from './swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { Express } from 'express';

async function bootstrap(): Promise<void> {
    let app: NestApplication = await NestFactory.create(AppModule, {
        abortOnError: true,
        bufferLogs: true,
        bodyParser: false,
        routeConflictPolicy: { duplicate: 'error', shadow: 'error' },
        routeResolutionStrategy: 'specificity',
    });

    app.useLogger(app.get(PinoLogger));

    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env')!;
    const timezone: string = configService.get<string>('app.timezone')!;
    const host: string = configService.get<string>('app.http.host')!;
    const port: number = configService.get<number>('app.http.port')!;
    const trustedProxy: string | null = configService.get<string | null>(
        'app.http.trustedProxy'
    )!;
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
    app.getHttpAdapter()
        .getInstance<Express>()
        .set('trust proxy', trustedProxy);

    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    const logger = new Logger(`${appName}-Main`);

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
    logger.log(`App Trusted Proxy: ${trustedProxy}`, 'NestApplication');
    const databaseHost = new URL(databaseUrl).host;
    logger.log(`Database Host: ${databaseHost}`, 'NestApplication');
    logger.log(`Database Debug: ${databaseDebug}`, 'NestApplication');
    logger.log(`Logger Auto: ${loggerAuto}`, 'NestApplication');
    logger.log(`Logger Debug Enable: ${loggerDebugEnable}`, 'NestApplication');
    logger.log(`Logger Debug Level: ${loggerDebugLevel}`, 'NestApplication');
    logger.log('=='.repeat(20), 'NestApplication');

    return;
}

/**
 * Forces the exit on a failed boot. Shutdown hooks are already registered by then, so the signal
 * listeners keep the event loop alive and nothing else would terminate the process.
 */
bootstrap().catch((error: unknown) => {
    const detail =
        error instanceof Error ? (error.stack ?? error.message) : String(error);

    process.stderr.write(`[Bootstrap] Failed to start the application\n`);
    process.stderr.write(`${detail}\n`);
    process.exit(1);
});
