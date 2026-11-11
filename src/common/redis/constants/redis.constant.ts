import { Redis } from 'ioredis';
import appConfigFunction from '@configs/app.config';
import redisConfigFunction from '@configs/redis.config';

const appConfigs = appConfigFunction();
const redisConfigs = redisConfigFunction();

/** @public */
export const RedisCacheClient = Symbol('RedisCacheClient');

/** @public */
export const RedisQueueClient = Symbol('RedisQueueClient');

/** @public */
export const RedisQueueWorkerClientToken = Symbol('RedisQueueWorkerClient');

/** @public */
export const RedisQueueWorkerClient = new Redis(redisConfigs.queue.url, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectionName: `${appConfigs.name}-${appConfigs.env}:processor`,
});

/** @public */
export const RedisConnectionErrorMessages = [
    "Stream isn't writeable and enableOfflineQueue options is false",
    'Command timed out',
    'Connection is closed.',
];

/** @public */
export const RedisConnectionErrorNames = [
    'MaxRetriesPerRequestError',
    'AbortError',
];

/** @public */
export const RedisConnectionErrorCodes = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'ENOTFOUND',
    'EHOSTUNREACH',
];
