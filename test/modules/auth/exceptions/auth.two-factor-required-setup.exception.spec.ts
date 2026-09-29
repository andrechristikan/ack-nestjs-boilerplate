import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';

describe('AuthTwoFactorRequiredSetupException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a login verification before required setup', () => {
            const exception = new AuthTwoFactorRequiredSetupException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorRequiredSetup,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorRequiredSetup
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.twoFactorRequiredSetup',
            });
        });
    });
});
