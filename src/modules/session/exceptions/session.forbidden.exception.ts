import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';

export class SessionForbiddenException extends AppBaseException {
    readonly module = 'session';
    readonly statusCode = EnumSessionStatusCodeError.forbidden;
    readonly statusCodeKey = EnumSessionStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('session.error.forbidden');
    }
}
