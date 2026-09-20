/**
 * Asserts at least one uppercase letter, one lowercase letter, and one digit. Length is checked separately.
 * @public
 */
export const RequestPasswordStrengthRegex =
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])/;

/**
 * Route metadata key marking a handler that overrides the request timeout.
 * @public
 */
export const RequestCustomTimeoutMetaKey = 'RequestCustomTimeoutMetaKey';

/**
 * Route metadata key holding a handler's overriding request timeout.
 * @public
 */
export const RequestCustomTimeoutValueMetaKey =
    'RequestCustomTimeoutValueMetaKey';

/**
 * Route metadata key holding the environments a handler is allowed to run in.
 * @public
 */
export const RequestEnvMetaKey = 'RequestEnvMetaKey';

/**
 * Route metadata key holding a handler's `@RequestThrottle` options.
 * @public
 */
export const RequestThrottleOptionsMetaKey = 'RequestThrottleOptionsMetaKey';

/**
 * Request-store key holding the resolved `IRequestLog` (IP, geo-location, user agent).
 * @public
 */
export const RequestLogStoreKey = 'RequestLogStore';
/**
 * Request-store key holding the resolved response language.
 * @public
 */
export const RequestLanguageStoreKey = 'RequestLanguageStore';
/**
 * Request-store key holding the resolved API version.
 * @public
 */
export const RequestVersionStoreKey = 'RequestVersionStore';
/**
 * Request-store key holding the correlation id.
 * @public
 */
export const RequestCorrelationIdStoreKey = 'RequestCorrelationIdStore';
/**
 * Request-store key holding the request id.
 * @public
 */
export const RequestIdStoreKey = 'RequestIdStore';
/**
 * Request-store key holding the acting user id the database extension stamps on writes.
 * @public
 */
export const RequestActorStoreKey = 'RequestActorStore';
/**
 * Request-store flag set once the per-request throttle has been counted.
 * @public
 */
export const RequestThrottleHandledStoreKey = 'RequestThrottleHandledStore';
