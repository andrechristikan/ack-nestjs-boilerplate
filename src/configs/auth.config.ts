import { registerAs } from '@nestjs/config';
import { seconds } from 'src/common/helper/constants/helper.function.constant';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        accessToken: {
            secretKey: process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
            expirationTime: seconds(
                process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED || '15m'
            ), // recommendation for production is 15m
            notBeforeExpirationTime: seconds('0'), // keep it in zero value

            encryptKey: process.env.AUTH_JWT_PAYLOAD_ACCESS_TOKEN_ENCRYPT_KEY,
            encryptIv: process.env.AUTH_JWT_PAYLOAD_ACCESS_TOKEN_ENCRYPT_IV,
        },

        refreshToken: {
            secretKey:
                process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY || '123456000',
            expirationTime: seconds(
                process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED || '7d'
            ), // recommendation for production is 7d
            expirationTimeRememberMe: seconds(
                process.env.AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_EXPIRED || '30d'
            ), // recommendation for production is 30d
            notBeforeExpirationTime: seconds(
                process.env.AUTH_JWT_REFRESH_TOKEN_NOT_BEFORE_EXPIRATION ||
                    '15m'
            ), // recommendation for production is 15m

            encryptKey: process.env.AUTH_JWT_PAYLOAD_REFRESH_TOKEN_ENCRYPT_KEY,
            encryptIv: process.env.AUTH_JWT_PAYLOAD_REFRESH_TOKEN_ENCRYPT_IV,
        },

        subject: process.env.AUTH_JWT_SUBJECT || 'ackDevelopment',
        audience: process.env.AUTH_JWT_AUDIENCE || 'https://example.com',
        issuer: process.env.AUTH_JWT_ISSUER || 'ack',
        prefixAuthorization: 'Bearer',
        payloadEncryption:
            process.env.AUTH_JWT_PAYLOAD_ENCRYPT === 'true' ? true : false,

        permissionToken: {
            headerName: 'x-permission-token',
            secretKey: process.env.AUTH_PERMISSION_TOKEN_SECRET_KEY || '123456',
            expirationTime: seconds(
                process.env.AUTH_PERMISSION_TOKEN_EXPIRED || '5m'
            ), // recommendation for production is 5m
            notBeforeExpirationTime: seconds('0'), // keep it in zero value

            encryptKey: process.env.AUTH_PAYLOAD_PERMISSION_TOKEN_ENCRYPT_KEY,
            encryptIv: process.env.AUTH_PAYLOAD_PERMISSION_TOKEN_ENCRYPT_IV,
        },

        password: {
            attempt: true,
            maxAttempt: 3,
            saltLength: 8,
            expiredIn: seconds('182d'), // recommendation for production is 182 days
        },
    })
);
