import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';

describe('AuthTwoFactorNotRequiredSetupException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a login-time setup that was not required', () => {
            const exception = new AuthTwoFactorNotRequiredSetupException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorNotRequiredSetup,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorNotRequiredSetup
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.twoFactorNotRequiredSetup',
            });
        });
    });
});
