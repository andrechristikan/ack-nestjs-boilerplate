import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class AuthJwtConfigMissingException extends AppUnknownException {
    constructor(readonly configKey: string) {
        super(null, `Invalid JWT configuration: ${configKey} is missing.`);
    }
}
