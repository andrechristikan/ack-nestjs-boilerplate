import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserVerificationMobileNumberResendLimitExceededException } from '@modules/user/exceptions/user.verification-mobile-number-resend-limit-exceeded.exception';

describe('UserVerificationMobileNumberResendLimitExceededException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a mobile number verification resent too soon', () => {
            const exception =
                new UserVerificationMobileNumberResendLimitExceededException(3);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationMobileNumberResendLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .verificationMobileNumberResendLimitExceeded
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath:
                    'user.error.verificationMobileNumberResendLimitExceeded',
                messageProperties: { resendIn: 3 },
            });
        });
    });
});
