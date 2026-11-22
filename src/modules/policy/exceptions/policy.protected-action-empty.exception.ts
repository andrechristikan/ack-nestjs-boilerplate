import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class PolicyProtectedActionEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'PolicyProtected needs at least one action per policy');
    }
}
