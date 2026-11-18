import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserMobileNumberOtpInvalidException } from '@modules/user/exceptions/user.mobile-number-otp-invalid.exception';

describe('UserMobileNumberOtpInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an invalid mobile number otp', () => {
            const exception = new UserMobileNumberOtpInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberOtpInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberOtpInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.mobileNumberOtpInvalid',
            });
        });
    });
});
