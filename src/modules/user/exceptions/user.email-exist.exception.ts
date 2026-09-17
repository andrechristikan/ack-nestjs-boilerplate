import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when the email is already registered.
 * @public
 */
export class UserEmailExistException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.emailExist;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('user.error.emailExist');
    }
}
