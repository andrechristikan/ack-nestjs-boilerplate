import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/** @public */
export class RoleProtectedEmptyException extends AppUnknownException {
    constructor() {
        super(null, 'RoleProtected needs at least one role');
    }
}
