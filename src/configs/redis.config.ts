import { registerAs } from '@nestjs/config';

export interface IConfigRedis {
    cache: {
        url: string;
        namespace: string;
        database: number;
        ttlInMs: number;
    };
    queue: {
        url: string;
        namespace: string;
        database: number;
    };
}

export default registerAs(
    'redis',
    (): IConfigRedis => ({
        cache: {
            url: process.env.CACHE_REDIS_URL ?? 'redis://localhost:6379',
            database: process.env.CACHE_REDIS_DATABASE
                ? +process.env.CACHE_REDIS_DATABASE
                : 0,
            namespace: 'cache',
            ttlInMs: 5 * 60 * 1000,
        },
        queue: {
            url: process.env.QUEUE_REDIS_URL ?? 'redis://localhost:6379',
            namespace: 'queue',
            database: process.env.QUEUE_REDIS_DATABASE
                ? +process.env.QUEUE_REDIS_DATABASE
                : 1,
        },
    })
);
