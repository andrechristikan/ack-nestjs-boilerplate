import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

export class UserUsernameNotAllowedException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.usernameNotAllowed;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('user.error.usernameNotAllowed');
    }
}
