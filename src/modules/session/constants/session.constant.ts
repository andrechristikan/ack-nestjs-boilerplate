/**
 * Injection token of the cache manager the session cache stores logins in.
 * @public
 */
export const SessionCacheProvider = 'SessionCacheProvider';

/**
 * Keys a per-user session purge asks Redis to examine on each `SCAN` call.
 * @public
 */
export const SessionCachePurgeScanCount = 1000;
