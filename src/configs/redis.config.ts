import { registerAs } from '@nestjs/config';

export default registerAs(
    'redis',
    (): Record<string, any> => ({
        cached: {
            host: process.env.REDIS_HOST,
            port: Number.parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
            ttl: 5 * 1000, // 5 mins
            max: 10,
        },
        queue: {
            host: process.env.REDIS_HOST,
            port: Number.parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
        },
    })
);
