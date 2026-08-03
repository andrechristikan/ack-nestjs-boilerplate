import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigDebug {
    enable: boolean;
    level: string;
    intoFile: boolean;
    filePath: string;
    auto: boolean;
    prettier: boolean;
    sentry: {
        dsn: string | null;
        timeoutInMs: number;
    };
}

export default registerAs(
    'logger',
    (): IConfigDebug => ({
        enable: process.env.LOGGER_ENABLE === 'true',
        level: process.env.LOGGER_LEVEL!,
        intoFile: process.env.LOGGER_INTO_FILE === 'true',
        filePath: '/logs',
        auto: process.env.LOGGER_AUTO === 'true',
        prettier: process.env.LOGGER_PRETTIER === 'true',
        sentry: {
            dsn: process.env.SENTRY_DSN ?? null,
            timeoutInMs: ms('10s'),
        },
    })
);
