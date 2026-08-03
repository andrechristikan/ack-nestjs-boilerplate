import { registerAs } from '@nestjs/config';
import ms from 'ms';

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
            url: process.env.CACHE_REDIS_URL!,
            namespace: 'Cache',
            ttlInMs: ms('5m'),
        },
        queue: {
            url: process.env.QUEUE_REDIS_URL!,
            namespace: 'Queue',
        },
    })
);
