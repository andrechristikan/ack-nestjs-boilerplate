import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when an admin action targets the caller's own account.
 * @public
 */
export class UserNotSelfException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notSelf;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('user.error.notSelf');
    }
}
