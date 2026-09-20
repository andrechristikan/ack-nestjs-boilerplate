import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when an action needs a verified email.
 * @public
 */
export class UserEmailNotVerifiedException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.emailNotVerified;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('user.error.emailNotVerified');
    }
}
