import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when the authenticated user no longer exists.
 * @public
 */
export class UserNotFoundForbiddenException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.notFoundForbidden;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('user.error.notFound');
    }
}
