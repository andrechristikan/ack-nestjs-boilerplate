import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'debug',
    (): Record<string, any> => ({
        sentry: {
            dsn: process.env.SENTRY_DSN,
            timeout: ms('10s'),
            logLevels: {
                exception: ['fatal'],
                request: ['log'],
            },
        },
    })
);
