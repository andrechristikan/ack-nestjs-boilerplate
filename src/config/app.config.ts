import { registerAs } from '@nestjs/config';

export default registerAs(
    'app',
    (): Record<string, any> => ({
        env: process.env.APP_ENV || 'development',
        language: process.env.APP_LANGUAGE || 'en',
        http: {
            host: process.env.APP_HOST || 'localhost',
            port: parseInt(process.env.APP_PORT) || 3000
        },
        timezone: process.env.APP_TZ || 'Asia/Jakarta',
        debug: process.env.APP_DEBUG === 'true' || false,
        debugger: {
            http: {
                active: true,
                maxFiles: 5,
                maxSize: '2M'
            },
            system: {
                active: true,
                maxFiles: '7d',
                maxSize: '2m'
            }
        }
    })
);
