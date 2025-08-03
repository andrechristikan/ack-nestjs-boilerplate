import { registerAs } from '@nestjs/config';

export interface IConfigRedis {
    cached: {
        host: string;
        port: number;
        password?: string;
        username?: string;
        ttl: number; // in milliseconds
        max: number; // maximum number of cached items
    };
    queue: {
        host: string;
        port: number;
        password?: string;
        username?: string;
    };
}

export default registerAs(
    'redis',
    (): IConfigRedis => ({
        cached: {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379,
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
            ttl: 5 * 60 * 1000, // 5 mins
            max: 10,
        },
        queue: {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379,
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
        },
    })
);
