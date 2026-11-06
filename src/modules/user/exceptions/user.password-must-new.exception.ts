import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/** @public */
export class UserPasswordMustNewException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.passwordMustNew;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor(readonly period: number) {
        super('user.error.passwordMustNew', {
            messageProperties: { period },
        });
    }
}
