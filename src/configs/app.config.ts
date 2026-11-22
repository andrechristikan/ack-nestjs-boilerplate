import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
import { registerAs } from '@nestjs/config';
import { author, repository, version } from '@generated/package/package';

export interface IConfigApp {
    name: string;
    env: EnumAppEnvironment;
    timezone: string;
    version: string;
    encryptionSecret: string;
    author: {
        name: string;
        emailAddress: string;
    };
    url: string;
    globalPrefix: string;
    http: {
        host: string;
        port: number;
        trustedProxies: string | null;
    };
    urlVersioning: {
        enabled: boolean;
        prefix: string;
        defaultVersion: string;
    };
}

export default registerAs('app', (): IConfigApp => {
    return {
        name: process.env.APP_NAME!,
        env: process.env.APP_ENV as EnumAppEnvironment,
        timezone: EnumRequestTimezone.asiaJakarta,
        version,
        encryptionSecret: process.env.APP_ENCRYPTION_SECRET!,
        author: { name: author.name, emailAddress: author.email },
        url: repository.url,
        globalPrefix: '/api',

        http: {
            host: process.env.APP_HTTP_HOST!,
            port: Number(process.env.APP_HTTP_PORT!),
            trustedProxies:
                process.env.APP_HTTP_TRUSTED_PROXIES === ''
                    ? null
                    : (process.env.APP_HTTP_TRUSTED_PROXIES ?? null),
        },
        urlVersioning: {
            enabled: true,
            prefix: 'v',
            defaultVersion: '1',
        },
    };
});
