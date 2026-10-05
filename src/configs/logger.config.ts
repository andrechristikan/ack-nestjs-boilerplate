import { registerAs } from '@nestjs/config';
import appConfigFunction from '@configs/app.config';
import docConfigFunction from '@configs/doc.config';
import ms from 'ms';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { readOptionalEnv } from '@common/request/validations/request.optional-env.validation';

export interface IConfigLogger {
    enable: boolean;
    level: EnumLoggerLevel;
    intoFile: boolean;
    filePath: string;
    auto: boolean;
    excludedRoutes: string[];
    prettier: boolean;
    sentry: {
        dsn: string | null;
        timeoutInMs: number;
        tracesSampleRate: number;
        tracesSampleRateProduction: number;
        profilesSampleRate: number;
        profilesSampleRateProduction: number;
    };
}

export default registerAs('logger', (): IConfigLogger => {
    const { globalPrefix } = appConfigFunction();
    const { prefix: docPrefix } = docConfigFunction();

    return {
        enable: process.env.LOGGER_ENABLE === 'true',
        level: process.env.LOGGER_LEVEL as EnumLoggerLevel,
        intoFile: process.env.LOGGER_INTO_FILE === 'true',
        filePath: '/logs',
        auto: process.env.LOGGER_AUTO === 'true',
        excludedRoutes: [
            `${globalPrefix}/public/hello`,
            `${globalPrefix}/public/hello/*`,
            `${globalPrefix}/system/health`,
            `${globalPrefix}/system/health/*`,
            '/metrics',
            '/metrics/*',
            '/favicon.ico',
            docPrefix,
            `${docPrefix}/*`,
            '/',
        ],
        prettier: process.env.LOGGER_PRETTIER === 'true',
        sentry: {
            dsn: readOptionalEnv(process.env.SENTRY_DSN),
            timeoutInMs: ms('10s'),
            tracesSampleRate: 1,
            tracesSampleRateProduction: 0.3,
            profilesSampleRate: 0.5,
            profilesSampleRateProduction: 0.1,
        },
    };
});
