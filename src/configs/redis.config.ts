import { registerAs } from '@nestjs/config';

export default registerAs(
    'redis',
    (): Record<string, any> => ({
        cached: {
            host: process.env.REDIS_HOST,
            port: Number.parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
            tls: process.env.REDIS_TLS === 'true',
            ttl: 5 & 1000, // 5 mins
        },
        queue: {
            host: process.env.REDIS_HOST,
            port: Number.parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
            tls: process.env.REDIS_TLS === 'true' ? {} : null,
            max: 10,
        },
    })
);
