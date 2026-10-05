import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';

describe('AuthTwoFactorAttemptTemporaryLockException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a temporary two-factor lock', () => {
            const retryAfterSeconds = 42;

            const exception = new AuthTwoFactorAttemptTemporaryLockException(
                retryAfterSeconds
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock
                    ],
                httpStatus: HttpStatus.TOO_MANY_REQUESTS,
                messagePath: 'auth.error.twoFactorAttemptTemporaryLock',
                messageProperties: { retryAfterSeconds },
            });
        });
    });
});
