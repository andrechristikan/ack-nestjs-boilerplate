import { registerAs } from '@nestjs/config';

export interface IConfigRedis {
    cache: {
        url: string;
        namespace: string;
        ttlInMs: number;
    };
    queue: {
        url: string;
        namespace: string;
    };
}

export default registerAs(
    'redis',
    (): IConfigRedis => ({
        cache: {
            url: process.env.CACHE_REDIS_URL ?? 'redis://localhost:6379',
            namespace: 'Cache',
            ttlInMs: 5 * 60 * 1000,
        },
        queue: {
            url: process.env.QUEUE_REDIS_URL ?? 'redis://localhost:6379',
            namespace: 'Queue',
        },
    })
);
