import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

/** @public */
export class SessionRevokedException extends AppBaseException {
    readonly module = 'session';
    readonly statusCode = EnumSessionStatusCodeError.revoked;
    readonly statusCodeKey = EnumSessionStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('session.error.revoked');
    }
}
