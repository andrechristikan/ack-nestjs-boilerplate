import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at boot when the Firebase Admin SDK throws while initializing; the SDK error rides in `rawError`.
 * @public
 */
export class FirebaseInitializationFailedException extends AppUnknownException {
    constructor(cause: unknown) {
        super(cause, 'Failed to initialize Firebase Admin SDK');
    }
}
