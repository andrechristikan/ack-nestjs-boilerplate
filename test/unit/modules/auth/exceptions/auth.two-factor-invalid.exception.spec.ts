import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorInvalidException } from '@modules/auth/exceptions/auth.two-factor-invalid.exception';

describe('AuthTwoFactorInvalidException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a wrong two-factor code', () => {
            const exception = new AuthTwoFactorInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.twoFactorInvalid',
            });
        });
    });
});
