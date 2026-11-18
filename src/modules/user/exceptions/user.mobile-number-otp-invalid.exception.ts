import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when the mobile number otp is wrong, expired, or used.
 * @public
 */
export class UserMobileNumberOtpInvalidException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.mobileNumberOtpInvalid;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('user.error.mobileNumberOtpInvalid');
    }
}
