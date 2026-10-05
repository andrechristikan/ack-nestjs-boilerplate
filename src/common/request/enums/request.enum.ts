/**
 * Timezone identifiers used for request date/time normalization.
 * @public
 */
export enum EnumRequestTimezone {
    asiaJakarta = 'Asia/Jakarta',
}

/**
 * Named per-route throttle policies applied by the throttle interceptor.
 * @public
 */
export enum EnumRequestThrottleRoute {
    strict = 'strict',
    moderate = 'moderate',
    relaxed = 'relaxed',
}

/**
 * Named throttlers; the value is the throttler name in Redis keys and the `X-RateLimit-*` header suffix.
 * @public
 */
export enum EnumRequestThrottleName {
    default = 'default',
    user = 'user',
    route = 'route',
}
