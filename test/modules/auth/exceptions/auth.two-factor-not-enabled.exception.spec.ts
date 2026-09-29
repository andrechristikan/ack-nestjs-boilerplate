import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';

describe('AuthTwoFactorNotEnabledException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for two-factor not enabled', () => {
            const exception = new AuthTwoFactorNotEnabledException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotEnabled
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.twoFactorNotEnabled',
            });
        });
    });
});
