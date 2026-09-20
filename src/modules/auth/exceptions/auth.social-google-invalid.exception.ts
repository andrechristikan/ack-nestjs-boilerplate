import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Raised when a Google sign-in token fails verification.
 * @public
 */
export class AuthSocialGoogleInvalidException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.socialGoogleInvalid;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor(rawError: unknown) {
        super('auth.error.socialGoogleInvalid', { rawError });
    }
}
