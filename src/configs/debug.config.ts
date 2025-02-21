import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'debug',
    (): Record<string, any> => ({
        enable: process.env.DEBUG_ENABLE === 'true',
        level: process.env.DEBUG_LEVEL,
        intoFile: process.env.DEBUG_INTO_FILE === 'true',
        filePath: '/logs',
        autoLogger: false,
        prettier: process.env.DEBUG_PRETTIER === 'true',
        sentry: {
            dsn: process.env.SENTRY_DSN,
            timeout: ms('10s'),
        },
    })
);
