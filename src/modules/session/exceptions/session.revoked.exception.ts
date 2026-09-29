import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

/**
 * Raised when a token session is missing or its token id does not match.
 * @public
 */
export class SessionRevokedException extends AppBaseException {
    readonly module = 'session';
    readonly statusCode = EnumSessionStatusCodeError.revoked;
    readonly statusCodeKey = EnumSessionStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('session.error.revoked');
    }
}
