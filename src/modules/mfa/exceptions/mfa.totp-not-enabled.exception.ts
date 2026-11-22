import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';

/** @public */
export class MfaTotpNotEnabledException extends AppBaseException {
    readonly module = 'mfa';
    readonly statusCode = EnumMfaStatusCodeError.totpNotEnabled;
    readonly statusCodeKey = EnumMfaStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('mfa.error.totpNotEnabled');
    }
}
