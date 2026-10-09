import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when a policy given to `PolicyProtected` has no action.
 * @public
 */
export class PolicyProtectedActionEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'PolicyProtected needs at least one action per policy');
    }
}
