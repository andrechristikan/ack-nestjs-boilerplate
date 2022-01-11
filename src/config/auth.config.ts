import { registerAs } from '@nestjs/config';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime: '1d',
                notBeforeExpirationTime: '0'
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime: '8d',
                notBeforeExpirationTime: '1d' // 1d
            },

            rememberMe: {
                notChecked: 7, // in days
                checked: 30 // in days
            }
        },

        basicToken: {
            clientId: process.env.AUTH_BASIC_TOKEN_CLIENT_ID || '123456',
            clientSecret:
                process.env.AUTH_BASIC_TOKEN_CLIENT_SECRET || '1234567890'
        },

        password: {
            saltLength: 8,
            expiredInDay: 365 // 1 year
        }
    })
);
