import { registerAs } from '@nestjs/config';
import { version } from 'package.json';

export default registerAs(
    'app',
    (): Record<string, any> => ({
        name: process.env.APP_NAME,
        env: process.env.APP_ENV,
        timezone: process.env.APP_TIMEZONE,
        version,
        globalPrefix: '/api',

        http: {
            host: process.env.HTTP_HOST,
            port: Number.parseInt(process.env.HTTP_PORT),
        },
        urlVersion: {
            enable: process.env.URL_VERSIONING_ENABLE === 'true',
            prefix: 'v',
            version: process.env.URL_VERSION,
        },
    })
);
