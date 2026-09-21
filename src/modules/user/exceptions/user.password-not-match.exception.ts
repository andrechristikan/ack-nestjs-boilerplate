import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when the given password does not match the stored one.
 * @public
 */
export class UserPasswordNotMatchException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.passwordNotMatch;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('auth.error.passwordNotMatch');
    }
}
