import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAuth {
    jwt: {
        accessToken: {
            kid: string;
            privateKey: string;
            publicKey: string;
            expirationTimeInSeconds: number;
        };
        refreshToken: {
            kid: string;
            privateKey: string;
            publicKey: string;
            expirationTimeInSeconds: number;
        };
        algorithm: string;
        jwksUri: string;
        audience: string;
        issuer: string;
        header: string;
        prefix: string;
    };
    password: {
        attempt: boolean;
        maxAttempt: number;
        saltLength: number;
        expiredInSeconds: number;
        expiredTemporaryInSeconds: number;
        periodInSeconds: number;
    };
    apple: {
        header: string;
        prefix: string;
        clientId?: string;
        signInClientId?: string;
    };
    google: {
        header: string;
        prefix: string;
        clientId?: string;
        clientSecret?: string;
    };
    xApiKey: {
        header: string;
        cachePrefixKey: string;
    };
}

export default registerAs(
    'auth',
    (): IConfigAuth => ({
        jwt: {
            accessToken: {
                kid: process.env.AUTH_JWT_ACCESS_TOKEN_KID,
                privateKey: process.env.AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY,
                publicKey: process.env.AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY,
                expirationTimeInSeconds:
                    ms(
                        process.env
                            .AUTH_JWT_ACCESS_TOKEN_EXPIRED as ms.StringValue
                    ) / 1000,
            },

            refreshToken: {
                kid: process.env.AUTH_JWT_REFRESH_TOKEN_KID,
                privateKey: process.env.AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY,
                publicKey: process.env.AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY,
                expirationTimeInSeconds:
                    ms(
                        process.env
                            .AUTH_JWT_REFRESH_TOKEN_EXPIRED as ms.StringValue
                    ) / 1000,
            },

            algorithm: 'ES512',
            jwksUri: process.env.AUTH_JWT_JWKS_URI,

            audience: process.env.AUTH_JWT_AUDIENCE,
            issuer: process.env.AUTH_JWT_ISSUER,
            header: 'Authorization',
            prefix: 'Bearer',
        },

        password: {
            attempt: true,
            maxAttempt: 5,
            saltLength: 8,
            expiredInSeconds: ms('182d') / 1000,
            expiredTemporaryInSeconds: ms('3d') / 1000,
            periodInSeconds: ms('90d') / 1000,
        },

        apple: {
            header: 'Authorization',
            prefix: 'Bearer',
            clientId: process.env.AUTH_SOCIAL_APPLE_CLIENT_ID,
            signInClientId: process.env.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID,
        },
        google: {
            header: 'Authorization',
            prefix: 'Bearer',
            clientId: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET,
        },
        xApiKey: {
            header: 'x-api-key',
            cachePrefixKey: 'ApiKey',
        },
    })
);
