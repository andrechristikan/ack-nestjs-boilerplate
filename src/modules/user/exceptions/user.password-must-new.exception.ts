import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

export class UserPasswordMustNewException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.passwordMustNew;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor(period: string | number) {
        super('auth.error.passwordMustNew', {
            messageProperties: { period },
        });
    }
}
