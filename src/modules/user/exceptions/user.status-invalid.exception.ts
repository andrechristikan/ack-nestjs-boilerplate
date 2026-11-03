import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when a status change repeats the current status or the current status no longer holds.
 * @public
 */
export class UserStatusInvalidException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.statusInvalid;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('user.error.statusInvalid');
    }
}
