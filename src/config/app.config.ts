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

        debug: process.env.APP_DEBUG === 'true' ? true : false,
        debugger: {
            http: {
                active: false,
                maxFiles: 5,
                maxSize: '10M'
            },
            system: {
                active: false,
                maxFiles: '7d',
                maxSize: '10m'
            }
        }
    })
);
