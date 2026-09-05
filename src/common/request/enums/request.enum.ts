/** Timezone identifiers used for request date/time normalization. */
export enum EnumRequestTimezone {
    asiaJakarta = 'Asia/Jakarta',
}

/** Named per-route throttle policies applied by the throttle interceptor. */
export enum EnumRequestThrottleRoute {
    strict = 'strict',
    moderate = 'moderate',
    relaxed = 'relaxed',
}
