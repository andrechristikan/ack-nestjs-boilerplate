import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';

describe('UserMobileNumberExistException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a mobile number already registered', () => {
            const exception = new UserMobileNumberExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'user.error.mobileNumberExist',
            });
        });
    });
});
