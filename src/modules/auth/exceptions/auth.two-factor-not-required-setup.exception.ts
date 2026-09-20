import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Raised when login-time two-factor setup is attempted but not required.
 * @public
 */
export class AuthTwoFactorNotRequiredSetupException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.twoFactorNotRequiredSetup;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('auth.error.twoFactorNotRequiredSetup');
    }
}
