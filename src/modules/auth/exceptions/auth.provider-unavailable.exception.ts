import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/** @public */
export class AuthProviderUnavailableException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.providerUnavailable;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    constructor(readonly rawError: unknown = null) {
        super('auth.error.providerUnavailable', { rawError });
    }
}
