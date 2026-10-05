import { registerAs } from '@nestjs/config';
import ms from 'ms';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

export interface IConfigLogger {
    enable: boolean;
    level: EnumLoggerLevel;
    intoFile: boolean;
    filePath: string;
    auto: boolean;
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

export default registerAs('logger', (): IConfigLogger => ({
    enable: process.env.LOGGER_ENABLE === 'true',
    level: process.env.LOGGER_LEVEL as EnumLoggerLevel,
    intoFile: process.env.LOGGER_INTO_FILE === 'true',
    filePath: '/logs',
    auto: process.env.LOGGER_AUTO === 'true',
    prettier: process.env.LOGGER_PRETTIER === 'true',
    sentry: {
        dsn: process.env.SENTRY_DSN || null,
        timeoutInMs: ms('10s'),
        tracesSampleRate: 1,
        tracesSampleRateProduction: 0.3,
        profilesSampleRate: 0.5,
        profilesSampleRateProduction: 0.1,
    },
}));
