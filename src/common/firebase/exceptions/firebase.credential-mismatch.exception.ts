import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class FirebaseCredentialMismatchException extends AppUnknownException {
    constructor(override readonly cause: unknown) {
        super(cause, 'Firebase credential does not match the project');
    }
}
