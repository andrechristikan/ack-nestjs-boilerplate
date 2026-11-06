import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/** @public */
export class UserForgotPasswordRequestLimitExceededException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode =
        EnumUserStatusCodeError.forgotPasswordRequestLimitExceeded;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.TOO_MANY_REQUESTS;

    constructor(readonly minutes: number) {
        super('user.error.forgotPasswordRequestLimitExceeded', {
            messageProperties: { minutes },
        });
    }
}
