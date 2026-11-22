import { HttpStatus } from '@nestjs/common';

/** @public */
export const AppBootstrapSentryFlushTimeoutInMs = 2000;

/** @public */
export const AppRefusalLogStatuses: ReadonlySet<HttpStatus> = new Set([
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.PAYLOAD_TOO_LARGE,
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.TOO_MANY_REQUESTS,
]);
