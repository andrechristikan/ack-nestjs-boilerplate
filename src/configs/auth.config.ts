import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                kid: process.env.AUTH_JWT_ACCESS_TOKEN_KID,
                privateKeyPath:
                    process.env.AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY_PATH,
                publicKeyPath:
                    process.env.AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY_PATH,
                expirationTime:
                    ms(
                        process.env
                            .AUTH_JWT_ACCESS_TOKEN_EXPIRED as ms.StringValue
                    ) / 1000,
            },

            refreshToken: {
                kid: process.env.AUTH_JWT_REFRESH_TOKEN_KID,
                privateKeyPath:
                    process.env.AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY_PATH,
                publicKeyPath:
                    process.env.AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY_PATH,
                expirationTime:
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
            expiredIn: ms('182d') / 1000, // 0.5 years
            expiredInTemporary: ms('3d') / 1000, // 3 days
            period: ms('90d') / 1000, // 3 months
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
        },
    })
);
