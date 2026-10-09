import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised at decoration time when `RoleProtected` receives no role.
 * @public
 */
export class RoleProtectedEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'RoleProtected needs at least one role');
    }
}
