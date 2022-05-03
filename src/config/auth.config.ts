import { registerAs } from '@nestjs/config';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime: '30m', // recommendation for production is 30m
                notBeforeExpirationTime: '0', // keep it in zero value
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime: '7d', // recommendation for production is 7d
                expirationTimeRememberMe: '30d', // recommendation for production is 30d
                notBeforeExpirationTime: '30m', // recommendation for production is 30m
            },
        },

        apiKey: {
            secret: process.env.AUTH_API_SECRET_KEY || '1234561241234124',
        },

        password: {
            saltLength: 8,
            expiredInDay: 182, // recommendation for production is 182 days
        },
    })
);
