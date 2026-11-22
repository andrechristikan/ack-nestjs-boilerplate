import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserReauthenticationOtpNotAllowedException } from '@modules/user/exceptions/user.reauthentication-otp-not-allowed.exception';

describe('UserReauthenticationOtpNotAllowedException', () => {
    describe('constructor', () => {
        it('declares the user module contract', () => {
            const exception = new UserReauthenticationOtpNotAllowedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: 51027,
                statusCodeKey: 'reauthenticationOtpNotAllowed',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.reauthenticationOtpNotAllowed',
            });
            expect(EnumUserStatusCodeError[exception.statusCode]).toBe(
                'reauthenticationOtpNotAllowed'
            );
        });
    });
});
