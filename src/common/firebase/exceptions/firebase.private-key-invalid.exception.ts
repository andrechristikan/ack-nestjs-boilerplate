import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class FirebasePrivateKeyInvalidException extends AppUnknownException {
    constructor() {
        super(null, 'Firebase private key could not be normalized');
    }
}
