import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';

describe('AuthTwoFactorAlreadyEnabledException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for two-factor already enabled', () => {
            const exception = new AuthTwoFactorAlreadyEnabledException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAlreadyEnabled
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.twoFactorAlreadyEnabled',
            });
        });
    });
});
