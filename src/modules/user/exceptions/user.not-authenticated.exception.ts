import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

export class UserNotAuthenticatedException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notAuthenticated;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('user.error.notAuthenticated');
    }
}
