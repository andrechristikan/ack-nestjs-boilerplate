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
