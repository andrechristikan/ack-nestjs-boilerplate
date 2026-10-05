import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';

describe('UserPasswordExpiredException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an expired password', () => {
            const exception = new UserPasswordExpiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordExpired
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'user.error.passwordExpired',
            });
        });
    });
});
