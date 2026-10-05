import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordMustNewException } from '@modules/user/exceptions/user.password-must-new.exception';

describe('UserPasswordMustNewException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a password reused within the reuse period', () => {
            const period = 90;

            const exception = new UserPasswordMustNewException(period);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordMustNew,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordMustNew
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.passwordMustNew',
                messageProperties: { period },
            });
        });
    });
});
