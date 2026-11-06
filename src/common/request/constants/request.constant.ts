import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Accepted shape of an inbound `x-request-id` or `x-correlation-id`; anything else is replaced by a server UUID v7.
 * @public
 */
export const RequestIdRegex = /^[A-Za-z0-9._-]{1,128}$/;

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
 * Error entries `@RequestEnvProtected` documents: the route answering as absent outside its allowed environments.
 * @public
 */
export const RequestEnvProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumRequestStatusCodeError.envNotAllowed,
        messagePath: 'http.clientError.notFound',
    },
];

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
