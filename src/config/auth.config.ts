import { registerAs } from '@nestjs/config';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime: '1d', // recommendation for production is 30m
                notBeforeExpirationTime: '0' // keep it in zero value
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime: '2d', // recommendation for production is 7d
                notBeforeExpirationTime: '1d' // recommendation for production is 30m
            }
        },

        rememberMe: {
            // for login expired
            notChecked: 7, // recommendation for production is 30 days
            checked: 30 // recommendation for production is 90 days
        },

        basicToken: {
            clientId: process.env.AUTH_BASIC_TOKEN_CLIENT_ID || '123456',
            clientSecret:
                process.env.AUTH_BASIC_TOKEN_CLIENT_SECRET || '1234567890'
        },

        password: {
            saltLength: 8,
            expiredInDay: 365 // recommendation for production is 182 days
        }
    })
);
