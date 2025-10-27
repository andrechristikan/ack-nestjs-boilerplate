import { registerAs } from '@nestjs/config';

export interface IConfigRedis {
    cached: {
        host: string;
        port: number;
        database?: number;
        password?: string;
        username?: string;
        ttlInMs: number;
        max: number;
    };
    queue: {
        host: string;
        port: number;
        database?: number;
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
            database: process.env.REDIS_DATABASE
                ? +process.env.REDIS_DATABASE
                : 0,
            password: process.env.REDIS_PASSWORD,
            username: process.env.REDIS_USERNAME,
            ttlInMs: 5 * 60 * 1000,
            max: 10,
        },
        queue: {
            host: process.env.QUEUE_REDIS_HOST ?? 'localhost',
            port: process.env.QUEUE_REDIS_PORT ? +process.env.REDIS_PORT : 6379,
            database: process.env.QUEUE_REDIS_DATABASE
                ? +process.env.QUEUE_REDIS_DATABASE
                : 1,
            password: process.env.QUEUE_REDIS_PASSWORD,
            username: process.env.QUEUE_REDIS_USERNAME,
        },
    })
);
