import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime: ms(
                    process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED || '30m'
                ), // recommendation for production is 30m
                notBeforeExpirationTime: ms(0), // keep it in zero value

                encryptKey: process.env.AUTH_JWT_ACCESS_TOKEN_ENCRYPT_KEY,
                encryptIv: process.env.AUTH_JWT_ACCESS_TOKEN_ENCRYPT_IV, // must int length 16
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime: ms(
                    process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED || '7d'
                ), // recommendation for production is 7d
                expirationTimeRememberMe: ms(
                    process.env.AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_EXPIRED ||
                        '30d'
                ), // recommendation for production is 30d
                notBeforeExpirationTime: ms(
                    process.env.AUTH_JWT_REFRESH_TOKEN_NOT_BEFORE_EXPIRATION ||
                        '30m'
                ), // recommendation for production is 30m

                encryptKey: process.env.AUTH_JWT_REFRESH_TOKEN_ENCRYPT_KEY,
                encryptIv: process.env.AUTH_JWT_REFRESH_TOKEN_ENCRYPT_IV, // must int length 16
            },

            subject: process.env.AUTH_JWT_SUBJECT || 'ackDevelopment',
            audience: process.env.AUTH_JWT_AUDIENCE || 'https://example.com',
            issuer: process.env.AUTH_JWT_ISSUER || 'ack',
            prefixAuthorization: 'Bearer',
            payloadEncryption:
                process.env.AUTH_JWT_PAYLOAD_ENCRYPTION === 'true'
                    ? true
                    : false,
        },

        password: {
            saltLength: 8,
            expiredInMs: ms('182d'), // recommendation for production is 182 days
        },
    })
);
