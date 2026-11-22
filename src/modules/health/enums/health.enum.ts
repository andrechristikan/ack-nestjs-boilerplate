/** @public */
export enum EnumHealthStatus {
    error = 'error',
    ok = 'ok',
    degraded = 'degraded',
    shuttingDown = 'shutting_down',
}

/** @public */
export enum EnumHealthIndicatorStatus {
    up = 'up',
    down = 'down',
}

/** @public */
export enum EnumHealthIndicatorKey {
    s3PublicBucket = 's3PublicBucket',
    s3PrivateBucket = 's3PrivateBucket',
    ses = 'ses',
    database = 'database',
    redis = 'redis',
    queue = 'queue',
    sentry = 'sentry',
    firebase = 'firebase',
    google = 'google',
    apple = 'apple',
    jwksAccessToken = 'jwksAccessToken',
    jwksRefreshToken = 'jwksRefreshToken',
    memoryRss = 'memoryRss',
    memoryHeap = 'memoryHeap',
    storage = 'storage',
}

/** @public */
export enum EnumHealthQueue {
    health = 'health',
}
