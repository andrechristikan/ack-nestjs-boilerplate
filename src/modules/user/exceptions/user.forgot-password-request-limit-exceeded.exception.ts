import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when a password reset is requested again too soon.
 * @public
 */
export class UserForgotPasswordRequestLimitExceededException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode =
        EnumUserStatusCodeError.forgotPasswordRequestLimitExceeded;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor(resendIn: number) {
        super('user.error.forgotPasswordRequestLimitExceeded', {
            messageProperties: { resendIn },
        });
    }
}
