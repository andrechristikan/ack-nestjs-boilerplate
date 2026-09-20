import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Raised when too many wrong two-factor codes lock verification for a while.
 * @public
 */
export class AuthTwoFactorAttemptTemporaryLockException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.TOO_MANY_REQUESTS;

    constructor(retryAfterSeconds: number) {
        super('auth.error.twoFactorAttemptTemporaryLock', {
            messageProperties: { retryAfterSeconds },
        });
    }
}
