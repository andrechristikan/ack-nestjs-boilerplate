import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';

describe('AuthTwoFactorAttemptMaxException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a spent two-factor attempt budget', () => {
            const exception = new AuthTwoFactorAttemptMaxException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'auth.error.twoFactorAttemptMax',
            });
        });
    });
});
