import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when the mobile number is already verified.
 * @public
 */
export class UserMobileNumberAlreadyVerifiedException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.mobileNumberAlreadyVerified;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('user.error.mobileNumberAlreadyVerified');
    }
}
