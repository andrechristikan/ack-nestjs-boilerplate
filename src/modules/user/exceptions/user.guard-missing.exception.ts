import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/** @public */
export class UserGuardMissingException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.guardMissing;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('user.error.guardMissing');
    }
}
