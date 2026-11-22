import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';

/** @public */
export class MfaTotpSecretUnavailableException extends AppBaseException {
    readonly module = 'mfa';
    readonly statusCode = EnumMfaStatusCodeError.totpSecretUnavailable;
    readonly statusCodeKey = EnumMfaStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('mfa.error.totpSecretUnavailable');
    }
}
