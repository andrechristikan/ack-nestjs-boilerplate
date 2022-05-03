import { registerAs } from '@nestjs/config';

export default registerAs(
    'app',
    (): Record<string, any> => ({
        name: process.env.APP_NAME || 'ack',
        env: process.env.APP_ENV || 'development',
        mode: process.env.APP_MODE || 'simple',
        language: process.env.APP_LANGUAGE || 'en',
        timezone: process.env.APP_TZ || 'Asia/Jakarta',

        http: {
            host: process.env.APP_HOST || 'localhost',
            port: parseInt(process.env.APP_PORT) || 3000,
        },
        versioning: process.env.APP_VERSIONING === 'true' || false,
        debug: process.env.APP_DEBUG === 'true' || false,
        debugger: {
            http: {
                maxFiles: 5,
                maxSize: '2M',
            },
            system: {
                active: false,
                maxFiles: '7d',
                maxSize: '2m',
            },
        },
    })
);
