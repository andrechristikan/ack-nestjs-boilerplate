import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

export class UserInactiveForbiddenException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.inactiveForbidden;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('user.error.inactive');
    }
}
