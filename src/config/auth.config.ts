import { registerAs } from '@nestjs/config';
import ms from 'ms';

export default registerAs(
    'auth',
    (): Record<string, any> => ({
        jwt: {
            accessToken: {
                secretKey:
                    process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY || '123456',
                expirationTime: process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED
                    ? ms(process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED)
                    : ms('30m'), // recommendation for production is 30m
                notBeforeExpirationTime: ms(0), // keep it in zero value
            },

            refreshToken: {
                secretKey:
                    process.env.AUTH_JWT_REFRESH_TOKEN_SECRET_KEY ||
                    '123456000',
                expirationTime: process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED
                    ? ms(process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED)
                    : ms('7d'), // recommendation for production is 7d
                expirationTimeRememberMe: process.env
                    .AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_EXPIRED
                    ? ms(process.env.AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_EXPIRED)
                    : ms('30d'), // recommendation for production is 30d
                notBeforeExpirationTime: process.env
                    .AUTH_JWT_ACCESS_TOKEN_EXPIRED
                    ? ms(process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED)
                    : ms('30m'), // recommendation for production is 30m
            },
        },

        password: {
            saltLength: 8,
            expiredInDay: 182, // recommendation for production is 182 days
        },
        
        basicToken: {
            clientId: process.env.AUTH_BASIC_TOKEN_CLIENT_ID,
            clientSecret: process.env.AUTH_BASIC_TOKEN_CLIENT_SECRET,
        },
    })
);
