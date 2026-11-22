import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';

/** @public */
export class MfaAttemptMaxException extends AppBaseException {
    readonly module = 'mfa';
    readonly statusCode = EnumMfaStatusCodeError.attemptMax;
    readonly statusCodeKey = EnumMfaStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('mfa.error.attemptMax');
    }
}
