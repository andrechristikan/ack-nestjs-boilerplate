import { EnumAppEnvironment } from '@app/enums/app.enum';
import { registerAs } from '@nestjs/config';
import { author, repository, version } from '@package';

export interface IConfigApp {
    name: string;
    env: EnumAppEnvironment;
    timezone: string;
    version: string;
    encryptionSecretKey: string;
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
        name: process.env.APP_NAME!,
        env:
            EnumAppEnvironment[process.env.APP_ENV! as EnumAppEnvironment] ??
            EnumAppEnvironment.local,
        timezone: process.env.APP_TIMEZONE!,
        version,
        encryptionSecretKey: process.env.APP_ENCRYPTION_SECRET_KEY!,
        author: author as {
            name: string;
            email: string;
        },
        url: repository.url,
        globalPrefix: '/api',

        http: {
            host: process.env.HTTP_HOST!,
            port: +process.env.HTTP_PORT!,
        },
        urlVersion: {
            enable: process.env.URL_VERSIONING_ENABLE === 'true',
            prefix: 'v',
            version: process.env.URL_VERSION!,
        },
    })
);
