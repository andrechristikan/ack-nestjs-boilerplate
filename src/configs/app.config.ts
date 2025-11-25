import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { registerAs } from '@nestjs/config';
import { author, repository, version } from 'package.json';

export interface IConfigApp {
    name: string;
    env: ENUM_APP_ENVIRONMENT;
    timezone: string;
    version: string;
    author: {
        name: string;
        email: string;
    };
    url: string;
    globalPrefix: string;
    http: {
        host: string;
        port: number;
    };
    urlVersion: {
        enable: boolean;
        prefix: string;
        version: string;
    };
}

export default registerAs(
    'app',
    (): IConfigApp => ({
        name: process.env.APP_NAME ?? 'ACKNestJs',
        env:
            ENUM_APP_ENVIRONMENT[process.env.APP_ENV] ??
            ENUM_APP_ENVIRONMENT.LOCAL,
        timezone: process.env.APP_TIMEZONE ?? 'Asia/Jakarta',
        version,
        author: author as {
            name: string;
            email: string;
        },
        url: repository.url,
        globalPrefix: '/api',

        http: {
            host: process.env.HTTP_HOST ?? 'localhost',
            port: process.env.HTTP_PORT ? +process.env.HTTP_PORT : 3000,
        },
        urlVersion: {
            enable: process.env.URL_VERSIONING_ENABLE === 'true',
            prefix: 'v',
            version: process.env.URL_VERSION ?? '1',
        },
    })
);
