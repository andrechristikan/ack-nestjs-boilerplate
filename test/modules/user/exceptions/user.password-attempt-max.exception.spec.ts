import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';

describe('UserPasswordAttemptMaxException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a user that exhausted the password attempts', () => {
            const exception = new UserPasswordAttemptMaxException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordAttemptMax
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'auth.error.passwordAttemptMax',
            });
        });
    });
});
