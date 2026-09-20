import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

/**
 * Raised when the requested session does not exist or is inactive.
 * @public
 */
export class SessionNotFoundException extends AppBaseException {
    readonly module = 'session';
    readonly statusCode = EnumSessionStatusCodeError.notFound;
    readonly statusCodeKey = EnumSessionStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('session.error.notFound');
    }
}
