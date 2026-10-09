import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Logged when the throttle Redis script answers a shape or a number the storage cannot read; the raw answer rides in `rawError`.
 * @public
 */
export class RequestThrottleResponseInvalidException extends AppUnknownException {
    constructor(response: unknown) {
        super(
            response,
            `Invalid Redis throttle response: ${JSON.stringify(response)}`
        );
    }
}
