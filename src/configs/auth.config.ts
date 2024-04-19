import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        accessToken: {
            secretKey: process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY ?? '123456',
            expirationTime: ms(
                process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED ?? '1h'
            ), // 1 hours
        },

        refreshToken: {
            secretKey:
                process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ?? '123456000',
            expirationTime: ms(
                process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED ?? '182d'
            ), // 1 hours
        },

        subject: process.env.AUTH_JWT_SUBJECT ?? 'ackDevelopment',
        audience: process.env.AUTH_JWT_AUDIENCE ?? 'https://example.com',
        issuer: process.env.AUTH_JWT_ISSUER ?? 'ack',
        prefixAuthorization: 'Bearer',

        password: {
            attempt: false,
            maxAttempt: 5,
            saltLength: 8,
            expiredIn: ms('182d'), // 182 days
        },
    })
);
