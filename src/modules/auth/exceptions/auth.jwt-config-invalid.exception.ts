import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at boot when a configured JWT key does not parse as the expected format; the parser error rides in `rawError`.
 * @public
 */
export class AuthJwtConfigInvalidException extends AppUnknownException {
    constructor(configKey: string, expected: string, cause: unknown) {
        super(
            cause,
            `Invalid JWT configuration: ${configKey} must be a valid base64-encoded ${expected}.`
        );
    }
}
