import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';

describe('UserEmailAlreadyVerifiedException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an already-verified email', () => {
            const exception = new UserEmailAlreadyVerifiedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailAlreadyVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailAlreadyVerified
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.emailAlreadyVerified',
            });
        });
    });
});
