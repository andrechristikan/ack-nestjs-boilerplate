import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserForgotPasswordRequestLimitExceededException } from '@modules/user/exceptions/user.forgot-password-request-limit-exceeded.exception';

describe('UserForgotPasswordRequestLimitExceededException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a too-soon password reset request', () => {
            const resendIn = 42;

            const exception =
                new UserForgotPasswordRequestLimitExceededException(resendIn);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.forgotPasswordRequestLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .forgotPasswordRequestLimitExceeded
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.forgotPasswordRequestLimitExceeded',
                messageProperties: { resendIn },
            });
        });
    });
});
