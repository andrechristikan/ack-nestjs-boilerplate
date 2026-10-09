import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';

describe('UserMobileNumberInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a mobile number failing country validation', () => {
            const exception = new UserMobileNumberInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.mobileNumberInvalid',
            });
        });
    });
});
