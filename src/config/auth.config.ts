import { registerAs } from '@nestjs/config';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime:
                    process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRATION_TIME || '1d',
                notBeforeExpirationTime:
                    process.env
                        .AUTH_JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION_TIME ||
                    '0',

                rememberMe: {
                    expirationTime:
                        process.env
                            .AUTH_JWT_ACCESS_TOKEN_REMEMBER_ME_EXPIRATION_TIME ||
                        '7d',
                    notBeforeExpirationTime:
                        process.env
                            .AUTH_JWT_ACCESS_TOKEN_REMEMBER_ME_NOT_BEFORE_EXPIRATION_TIME ||
                        '0'
                }
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime:
                    process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRATION_TIME || '2d',
                notBeforeExpirationTime:
                    process.env
                        .AUTH_JWT_REFRESH_TOKEN_NOT_BEFORE_EXPIRATION_TIME ||
                    '0',

                rememberMe: {
                    expirationTime:
                        process.env
                            .AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_EXPIRATION_TIME ||
                        '9d',
                    notBeforeExpirationTime:
                        process.env
                            .AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_NOT_BEFORE_EXPIRATION_TIME ||
                        '0'
                }
            }
        },

        basicToken: {
            clientId: process.env.AUTH_BASIC_TOKEN_CLIENT_ID || '123456',
            clientSecret:
                process.env.AUTH_BASIC_TOKEN_CLIENT_SECRET || '1234567890'
        }
    })
);
