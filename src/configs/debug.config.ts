import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'debug',
    (): Record<string, any> => ({
        enable: process.env.DEBUG_ENABLE === 'true',
        level: process.env.DEBUG_LEVEL,
        sentry: {
            dsn: process.env.SENTRY_DSN,
            timeout: ms('10s'),
        },
    })
);
