import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';

describe('UserReauthenticationOtpInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract', () => {
            const exception = new UserReauthenticationOtpInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: 51030,
                statusCodeKey: 'reauthenticationOtpInvalid',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.reauthenticationOtpInvalid',
            });
            expect(EnumUserStatusCodeError[exception.statusCode]).toBe(
                'reauthenticationOtpInvalid'
            );
        });
    });
});
