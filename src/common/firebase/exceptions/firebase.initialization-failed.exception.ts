import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class FirebaseInitializationFailedException extends AppUnknownException {
    constructor(readonly cause: unknown) {
        super(cause, 'Failed to initialize Firebase Admin SDK');
    }
}
