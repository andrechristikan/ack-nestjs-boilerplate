import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class AuthJwtConfigInvalidException extends AppUnknownException {
    constructor(
        readonly configKey: string,
        readonly expected: string,
        readonly cause: unknown
    ) {
        super(
            cause,
            `Invalid JWT configuration: ${configKey} must be a valid base64-encoded ${expected}.`
        );
    }
}
