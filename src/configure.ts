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

/** Applies the HTTP settings `main.ts` and an e2e app share. */
export function configure(app: NestApplication): NestApplication {
    app.useLogger(app.get(PinoLogger));

    const configService = app.get(ConfigService);
    const globalPrefix: string = configService.get<string>('app.globalPrefix')!;
    const trustedProxy: string | null = configService.get<string | null>(
        'app.http.trustedProxy'
    )!;
    const versionEnable: boolean = configService.get<boolean>(
        'app.urlVersion.enable'
    )!;
    const versioningPrefix: string = configService.get<string>(
        'app.urlVersion.prefix'
    )!;
    const version: string = configService.get<string>(
        'app.urlVersion.version'
    )!;

    app.setGlobalPrefix(globalPrefix);
    app.getHttpAdapter()
        .getInstance<Express>()
        .set('trust proxy', trustedProxy);
    app.getHttpAdapter().getInstance<Express>().disable('x-powered-by');

    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    return app;
}
