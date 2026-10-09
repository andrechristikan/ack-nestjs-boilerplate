import { EnumAppEnvironment } from '@app/enums/app.enum';
import { registerAs } from '@nestjs/config';
import { author, repository, version } from '@generated/package/package';

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
        trustedProxy: string | null;
    };
    urlVersion: {
        enable: boolean;
        prefix: string;
        version: string;
    };
}

export default registerAs('app', (): IConfigApp => {
    return {
        name: process.env.APP_NAME!,
        env: process.env.APP_ENV as EnumAppEnvironment,
        timezone: process.env.APP_TIMEZONE!,
        version,
        encryptionSecretKey: process.env.APP_ENCRYPTION_SECRET_KEY!,
        author,
        url: repository.url,
        globalPrefix: '/api',

        http: {
            host: process.env.HTTP_HOST!,
            port: Number(process.env.HTTP_PORT!),
            /**
             * Trusted proxy NETWORK list for Express `trust proxy` — the `proxy-addr` preset names
             * (`loopback, linklocal, uniquelocal`) or explicit CIDRs, never a hop count and never
             * `true`. Empty trusts no proxy, so `req.ip` is the direct socket peer and a client
             * cannot forge it through `X-Forwarded-For`.
             */
            trustedProxy:
                process.env.HTTP_TRUSTED_PROXY === ''
                    ? null
                    : (process.env.HTTP_TRUSTED_PROXY ?? null),
        },
        urlVersion: {
            enable: process.env.URL_VERSIONING_ENABLE === 'true',
            prefix: 'v',
            version: `${Number(process.env.URL_VERSION!)}`,
        },
    };
});
