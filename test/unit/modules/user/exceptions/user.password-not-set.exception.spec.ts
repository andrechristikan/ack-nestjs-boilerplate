import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordNotSetException } from '@modules/user/exceptions/user.password-not-set.exception';

describe('UserPasswordNotSetException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a password login targeting an account with no password', () => {
            const exception = new UserPasswordNotSetException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotSet,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordNotSet
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.passwordNotSet',
            });
        });
    });
});
