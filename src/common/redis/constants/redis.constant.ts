/** @public */
export const RedisCacheClient = Symbol('RedisCacheClient');

/** @public */
export const RedisQueueClient = Symbol('RedisQueueClient');

/** @public */
export const RedisQueueWorkerClient = Symbol('RedisQueueWorkerClient');

/** @public */
export const RedisConnectionErrorMessages: ReadonlySet<string> = new Set([
    "Stream isn't writeable and enableOfflineQueue options is false",
    'Command timed out',
    'Connection is closed.',
]);

/** @public */
export const RedisConnectionErrorNames: ReadonlySet<string> = new Set([
    'MaxRetriesPerRequestError',
    'AbortError',
]);

/** @public */
export const RedisConnectionErrorCodes: ReadonlySet<string> = new Set([
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'ENOTFOUND',
    'EHOSTUNREACH',
]);
