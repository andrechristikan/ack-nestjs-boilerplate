import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Raised when an authenticator code is checked but the stored two-factor secret is missing or unreadable.
 * @public
 */
export class AuthTwoFactorSecretUnavailableException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.twoFactorSecretUnavailable;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('auth.error.twoFactorSecretUnavailable');
    }
}
