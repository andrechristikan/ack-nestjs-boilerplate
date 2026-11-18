import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when a mobile number verification otp is resent too soon.
 * @public
 */
export class UserVerificationMobileNumberResendLimitExceededException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode =
        EnumUserStatusCodeError.verificationMobileNumberResendLimitExceeded;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor(resendIn: number) {
        super('user.error.verificationMobileNumberResendLimitExceeded', {
            messageProperties: { resendIn },
        });
    }
}
