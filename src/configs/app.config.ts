import { registerAs } from '@nestjs/config';
import ms from 'ms';
import { version } from 'package.json';

export default registerAs(
    'app',
    (): Record<string, any> => ({
        name: process.env.APP_NAME || 'ack',
        env: process.env.APP_ENV || 'development',
        mode: process.env.APP_MODE || 'simple',
        language: process.env.APP_LANGUAGE || 'en',
        timezone: process.env.APP_TZ || 'Asia/Jakarta',

        version: process.env.APP_VERSION || '1',
        repoVersion: version,
        versioning: {
            on: process.env.APP_VERSIONING === 'true' || false,
            prefix: 'v',
        },

        http: {
            host: process.env.APP_HOST || 'localhost',
            port: Number.parseInt(process.env.APP_PORT) || 3000,
        },
        globalPrefix: '/api',
        debug: process.env.APP_DEBUG === 'true' || false,
        debugger: {
            http: {
                maxFiles: 5,
                maxSize: '2M',
            },
            system: {
                active: false,
                maxFiles: ms('7d'),
                maxSize: '2m',
            },
        },

        httpOn: process.env.APP_HTTP_ON === 'true' ? true : false,
        jobOn: process.env.APP_JOB_ON === 'true' || false,
    })
);
