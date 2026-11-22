import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserReauthenticationOtpResendLimitException } from '@modules/user/exceptions/user.reauthentication-otp-resend-limit.exception';

describe('UserReauthenticationOtpResendLimitException', () => {
    describe('constructor', () => {
        it('declares the user module contract', () => {
            const exception = new UserReauthenticationOtpResendLimitException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: 51028,
                statusCodeKey: 'reauthenticationOtpResendLimit',
                httpStatus: HttpStatus.TOO_MANY_REQUESTS,
                messagePath: 'user.error.reauthenticationOtpResendLimit',
            });
            expect(EnumUserStatusCodeError[exception.statusCode]).toBe(
                'reauthenticationOtpResendLimit'
            );
        });
    });
});
