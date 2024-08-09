import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey: process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY,
                expirationTime:
                    ms(process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED) / 1000, // 1 hours
            },

            refreshToken: {
                secretKey: process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY,
                expirationTime:
                    ms(process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED) / 1000, // 1 hours
            },

            subject: process.env.AUTH_JWT_SUBJECT,
            audience: process.env.AUTH_JWT_AUDIENCE,
            issuer: process.env.AUTH_JWT_ISSUER,
            prefixAuthorization: 'Bearer',
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
            clientId: process.env.AUTH_SOCIAL_APPLE_CLIENT_ID,
            signInClientId: process.env.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID,
        },
        google: {
            clientId: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET,
        },
    })
);
