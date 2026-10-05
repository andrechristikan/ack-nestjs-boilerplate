import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Raised when Google sign-in is requested and the Google integration is not configured.
 * @public
 */
export class AuthSocialGoogleNotConfiguredException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.socialGoogleNotConfigured;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('auth.error.socialGoogleNotConfigured');
    }
}
