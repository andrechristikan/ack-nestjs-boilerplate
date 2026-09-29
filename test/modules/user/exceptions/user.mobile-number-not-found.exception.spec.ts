import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';

describe('UserMobileNumberNotFoundException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a mobile number that does not exist', () => {
            const exception = new UserMobileNumberNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'user.error.mobileNumberNotFound',
            });
        });
    });
});
