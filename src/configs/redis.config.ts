import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigRedis {
    cache: {
        url: string;
        namespace: string;
    };
    queue: {
        url: string;
        namespace: string;
    };
    commandTimeoutInMs: number;
    connectTimeoutInMs: number;
    warnWindowInMs: number;
}

export default registerAs('redis', (): IConfigRedis => {
    return {
        cache: {
            url: process.env.CACHE_REDIS_URL!,
            namespace: 'Cache',
        },
        queue: {
            url: process.env.QUEUE_REDIS_URL!,
            namespace: 'Queue',
        },
        commandTimeoutInMs: ms('2s'),
        connectTimeoutInMs: ms('5s'),
        warnWindowInMs: ms('1m'),
    };
});
