import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class PolicyProtectedEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'PolicyProtected needs at least one policy');
    }
}
