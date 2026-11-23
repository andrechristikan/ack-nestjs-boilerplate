import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class AuthJwtConfigInvalidException extends AppUnknownException {
    constructor(
        override readonly cause: unknown,
        readonly configKey: string,
        readonly expected: string
    ) {
        super(
            cause,
            `Invalid JWT configuration: ${configKey} must be a valid base64-encoded ${expected}.`
        );
    }
}
