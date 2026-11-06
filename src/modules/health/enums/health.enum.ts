/**
 * Overall status of a health check; `shuttingDown` travels on the wire as `shutting_down`.
 * @public
 */
export enum EnumHealthStatus {
    error = 'error',
    ok = 'ok',
    degraded = 'degraded',
    shuttingDown = 'shutting_down',
}

/**
 * Status of a single Terminus indicator inside a check's info, error and details maps.
 * @public
 */
export enum EnumHealthIndicatorStatus {
    up = 'up',
    down = 'down',
}

/**
 * Key a health check reports each Terminus indicator under in its info, error and details maps.
 * @public
 */
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
