import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when `PolicyProtected` receives no policy.
 * @public
 */
export class PolicyProtectedEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'PolicyProtected needs at least one policy');
    }
}
