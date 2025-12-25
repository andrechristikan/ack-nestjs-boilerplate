import { EnumAppEnvironment } from '@app/enums/app.enum';
import { registerAs } from '@nestjs/config';
import { author, repository, version } from 'package.json';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';

export interface IConfigApp {
    name: string;
    env: EnumAppEnvironment;
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
            EnumAppEnvironment[process.env.APP_ENV] ?? EnumAppEnvironment.local,
        timezone: process.env.APP_TIMEZONE ?? EnumRequestTimezone.asiaJakarta,
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
