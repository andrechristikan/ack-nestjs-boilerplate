/**
 * Response header the health endpoints set to disable caching.
 * @public
 */
export const HealthCacheControlHeaderName = 'Cache-Control';

/**
 * Value of the health endpoints' no-cache header.
 * @public
 */
export const HealthCacheControlHeaderValue =
    'no-cache, no-store, must-revalidate';

/**
 * Cache key the Redis health probe reads.
 * @public
 */
export const HealthRedisProbeKey = 'health-check';
