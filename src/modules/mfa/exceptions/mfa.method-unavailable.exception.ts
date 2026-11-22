import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';

/** @public */
export class MfaMethodUnavailableException extends AppBaseException {
    readonly module = 'mfa';
    readonly statusCode = EnumMfaStatusCodeError.methodUnavailable;
    readonly statusCodeKey = EnumMfaStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('mfa.error.methodUnavailable');
    }
}
