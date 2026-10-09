import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at boot when a required JWT key is not configured.
 * @public
 */
export class AuthJwtConfigMissingException extends AppUnknownException {
    constructor(configKey: string) {
        super(null, `Invalid JWT configuration: ${configKey} is missing.`);
    }
}
