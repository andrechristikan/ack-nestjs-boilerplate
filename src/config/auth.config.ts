import { registerAs } from '@nestjs/config';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime: '1d',
                notBeforeExpirationTime: '0',

                rememberMe: {
                    expirationTime: '7d',
                    notBeforeExpirationTime: '0'
                }
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime: '1d',
                notBeforeExpirationTime: '1d',

                rememberMe: {
                    expirationTime: '7d',
                    notBeforeExpirationTime: '7d'
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
