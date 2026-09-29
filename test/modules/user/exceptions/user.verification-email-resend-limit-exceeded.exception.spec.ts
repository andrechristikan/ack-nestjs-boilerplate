import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserVerificationEmailResendLimitExceededException } from '@modules/user/exceptions/user.verification-email-resend-limit-exceeded.exception';

describe('UserVerificationEmailResendLimitExceededException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a verification email resent too soon', () => {
            const resendIn = 30;

            const exception =
                new UserVerificationEmailResendLimitExceededException(resendIn);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationEmailResendLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .verificationEmailResendLimitExceeded
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.verificationEmailResendLimitExceeded',
                messageProperties: { resendIn },
            });
        });
    });
});
