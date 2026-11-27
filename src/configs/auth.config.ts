import { registerAs } from '@nestjs/config';
import ms from 'ms';
import type { Algorithm } from 'jsonwebtoken';

export interface IConfigAuth {
    jwt: {
        accessToken: {
            jwksUri: string;
            kid: string;
            algorithm: Algorithm;
            privateKey: string;
            expiresInSeconds: number;
        };
        refreshToken: {
            jwksUri: string;
            kid: string;
            algorithm: Algorithm;
            privateKey: string;
            expiresInSeconds: number;
        };
        audience: string;
        issuer: string;
        jtiLength: number;
    };
    password: {
        temporaryExpiresInMs: number;
        periodInDays: number;
        temporaryLength: number;
        contextWordMinLength: number;
    };
    social: {
        google: {
            clientId: string | null;
        };
        apple: {
            clientIds: string[];
        };
        nonce: {
            length: number;
            expiresInMs: number;
        };
    };
    xApiKey: {
        keyLength: number;
        secretLength: number;
        keyPattern: string;
        cacheTtlInMs: number;
        leaseKeyPattern: string;
        leaseTtlInMs: number;
    };
    jwks: {
        requestsPerMinute: number;
        cacheMaxAgeInMs: number;
    };
}

export default registerAs('auth', (): IConfigAuth => {
    return {
        jwt: {
            accessToken: {
                jwksUri: process.env.AUTH_JWT_ACCESS_TOKEN_JWKS_URI!,
                kid: process.env.AUTH_JWT_ACCESS_TOKEN_KID!,
                algorithm: 'ES256',
                privateKey: process.env.AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY!,
                expiresInSeconds: ms('1h') / 1000,
            },

            refreshToken: {
                jwksUri: process.env.AUTH_JWT_REFRESH_TOKEN_JWKS_URI!,
                kid: process.env.AUTH_JWT_REFRESH_TOKEN_KID!,
                algorithm: 'ES512',
                privateKey: process.env.AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY!,
                expiresInSeconds: ms('30d') / 1000,
            },

            audience: process.env.AUTH_JWT_AUDIENCE!,
            issuer: process.env.AUTH_JWT_ISSUER!,
            jtiLength: 32,
        },

        password: {
            temporaryExpiresInMs: ms('3d'),
            periodInDays: ms('90d') / ms('1d'),
            temporaryLength: 10,
            contextWordMinLength: 4,
        },

        social: {
            google: {
                clientId:
                    process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID === ''
                        ? null
                        : (process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID ?? null),
            },
            apple: {
                clientIds: (process.env.AUTH_SOCIAL_APPLE_CLIENT_IDS ?? '')
                    .split(',')
                    .map(clientId => clientId.trim())
                    .filter(clientId => clientId !== ''),
            },
            nonce: {
                length: 32,
                expiresInMs: ms('5m'),
            },
        },
        xApiKey: {
            keyLength: 25,
            secretLength: 50,
            keyPattern: 'ApiKey:{key}',
            cacheTtlInMs: ms('5m'),
            leaseKeyPattern: 'ApiKey:Lease:{key}',
            leaseTtlInMs: ms('10s'),
        },
        jwks: {
            requestsPerMinute: 60,
            cacheMaxAgeInMs: ms('10m'),
        },
    };
});
