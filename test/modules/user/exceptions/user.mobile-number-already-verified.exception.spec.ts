import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';

describe('UserMobileNumberAlreadyVerifiedException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a mobile number that is already verified', () => {
            const exception = new UserMobileNumberAlreadyVerifiedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberAlreadyVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberAlreadyVerified
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.mobileNumberAlreadyVerified',
            });
        });
    });
});
