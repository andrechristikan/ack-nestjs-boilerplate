import { registerAs } from '@nestjs/config';
import { version } from 'package.json';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

export default registerAs(
    'app',
    (): Record<string, any> => ({
        name: process.env.APP_NAME,
        env: process.env.APP_ENV,
        timezone: process.env.APP_TIMEZONE,
        repoVersion: version,
        globalPrefix:
            process.env.APP_ENV === ENUM_APP_ENVIRONMENT.PRODUCTION
                ? ''
                : '/api',

        debug: process.env.APP_DEBUG === 'true',

        jobEnable: process.env.JOB_ENABLE === 'true',

        http: {
            enable: process.env.HTTP_ENABLE === 'true',
            host: process.env.HTTP_HOST,
            port: Number.parseInt(process.env.HTTP_PORT),
        },
        urlVersion: {
            enable: process.env.URL_VERSION_ENABLE === 'true',
            prefix: 'v',
            version: process.env.URL_VERSION,
        },
    })
);
