import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthPasswordCommonException } from '@modules/auth/exceptions/auth.password-common.exception';

describe('AuthPasswordCommonException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a refused password', () => {
            const exception = new AuthPasswordCommonException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.passwordCommon,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.passwordCommon
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.passwordCommon',
            });
        });
    });
});
