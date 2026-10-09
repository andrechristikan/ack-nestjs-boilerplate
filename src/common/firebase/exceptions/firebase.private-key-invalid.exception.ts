import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at boot when the configured Firebase private key cannot be normalized into a PEM key.
 * @public
 */
export class FirebasePrivateKeyInvalidException extends AppUnknownException {
    constructor() {
        super(null, 'Firebase private key could not be normalized');
    }
}
