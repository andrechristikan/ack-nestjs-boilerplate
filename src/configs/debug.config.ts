import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigDebug {
    enable: boolean;
    level: string;
    intoFile: boolean;
    filePath: string;
    autoLogger: boolean;
    prettier: boolean;
    sentry: {
        dsn?: string;
        timeout: number; // in milliseconds
    };
}

export default registerAs(
    'debug',
    (): IConfigDebug => ({
        enable: process.env.DEBUG_ENABLE === 'true',
        level: process.env.DEBUG_LEVEL ?? 'debug',
        intoFile: process.env.DEBUG_INTO_FILE === 'true',
        filePath: '/logs',
        autoLogger: process.env.DEBUG_AUTO_LOGGER === 'true',
        prettier: process.env.DEBUG_PRETTIER === 'true',
        sentry: {
            dsn: process.env.SENTRY_DSN,
            timeout: ms('10s'),
        },
    })
);
