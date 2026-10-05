import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorSecretUnavailableException } from '@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception';

describe('AuthTwoFactorSecretUnavailableException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a missing or unreadable secret', () => {
            const exception = new AuthTwoFactorSecretUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'auth.error.twoFactorSecretUnavailable',
            });
        });
    });
});
