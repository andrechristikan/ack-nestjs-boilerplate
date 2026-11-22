import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class RequestThrottleResponseInvalidException extends AppUnknownException {
    constructor(readonly response: unknown) {
        super(
            response,
            `Invalid Redis throttle response: ${JSON.stringify(response)}`
        );
    }
}
