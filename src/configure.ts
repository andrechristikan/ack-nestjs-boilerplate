import { VersioningType } from '@nestjs/common';
import type { NestApplicationOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestApplication } from '@nestjs/core';
import type { Express } from 'express';
import { Logger as PinoLogger } from 'nestjs-pino';

export const ConfigureOptions: NestApplicationOptions = {
    abortOnError: false,
    bufferLogs: true,
    logger: ['fatal'],
    bodyParser: false,
    routeConflictPolicy: { duplicate: 'error', shadow: 'error' },
    routeResolutionStrategy: 'specificity',
};

export function configure(app: NestApplication): NestApplication {
    app.useLogger(app.get(PinoLogger));

    const configService = app.get(ConfigService);
    const globalPrefix: string = configService.get<string>('app.globalPrefix')!;
    const trustedProxies: string | null = configService.get<string | null>(
        'app.http.trustedProxies'
    )!;
    const enabled: boolean = configService.get<boolean>(
        'app.urlVersioning.enabled'
    )!;
    const prefix: string = configService.get<string>(
        'app.urlVersioning.prefix'
    )!;
    const defaultVersion: string = configService.get<string>(
        'app.urlVersioning.defaultVersion'
    )!;

    app.setGlobalPrefix(globalPrefix);
    app.getHttpAdapter()
        .getInstance<Express>()
        .set('trust proxy', trustedProxies);
    app.getHttpAdapter().getInstance<Express>().disable('x-powered-by');

    if (enabled) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion,
            prefix,
        });
    }

    return app;
}
