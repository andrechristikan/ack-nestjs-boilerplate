import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthPasswordContextWordException } from '@modules/auth/exceptions/auth.password-context-word.exception';

describe('AuthPasswordContextWordException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a refused password', () => {
            const exception = new AuthPasswordContextWordException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.passwordContextWord,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.passwordContextWord
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.passwordContextWord',
            });
        });
    });
});
