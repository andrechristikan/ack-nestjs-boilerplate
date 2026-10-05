import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';

describe('UserPasswordNotMatchException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a password that does not match the stored one', () => {
            const exception = new UserPasswordNotMatchException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotMatch
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.passwordNotMatch',
            });
        });
    });
});
