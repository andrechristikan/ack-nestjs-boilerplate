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
export const RequestLogStoreKey = 'RequestLogStoreKey';
/**
 * Request-store key holding the resolved response language.
 * @public
 */
export const RequestLanguageStoreKey = 'RequestLanguageStoreKey';
/**
 * Request-store key holding the resolved API version.
 * @public
 */
export const RequestVersionStoreKey = 'RequestVersionStoreKey';
/**
 * Request-store key holding the correlation id.
 * @public
 */
export const RequestCorrelationIdStoreKey = 'RequestCorrelationIdStoreKey';
/**
 * Request-store key holding the request id.
 * @public
 */
export const RequestIdStoreKey = 'RequestIdStoreKey';
/**
 * Request-store key holding the acting user id the database extension stamps on writes.
 * @public
 */
export const RequestActorStoreKey = 'RequestActorStoreKey';
/**
 * Request-store flag set once the per-request throttle has been counted.
 * @public
 */
export const RequestThrottleHandledStoreKey = 'RequestThrottleHandledStoreKey';

/**
 * Header carrying the response language, read from the request and echoed on the response.
 * @public
 */
export const RequestCustomLangHeaderName = 'x-custom-lang';

/**
 * Header carrying the correlation id shared across services, read from the request and echoed on the response.
 * @public
 */
export const RequestCorrelationIdHeaderName = 'x-correlation-id';

/**
 * Header carrying the id of one request, set on the request and echoed on the response.
 * @public
 */
export const RequestIdHeaderName = 'x-request-id';

/**
 * Prefix of the `-Limit-`, `-Remaining-`, and `-Reset-` throttle response headers.
 * @public
 */
export const RequestThrottleHeaderName = 'X-RateLimit';

/**
 * Request header naming the active workspace.
 * @public
 */
export const RequestWorkspaceIdHeaderName = 'x-workspace-id';

/**
 * Request-store key holding the workspace id read from `RequestWorkspaceIdHeaderName`.
 * @public
 */
export const RequestWorkspaceIdStoreKey = 'RequestWorkspaceIdStoreKey';
