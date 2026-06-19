import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

export class UserUsernameExistException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.usernameExist;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('user.error.usernameExist');
    }
}
