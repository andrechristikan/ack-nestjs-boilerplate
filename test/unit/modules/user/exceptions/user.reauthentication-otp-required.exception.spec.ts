import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserReauthenticationOtpRequiredException } from '@modules/user/exceptions/user.reauthentication-otp-required.exception';

describe('UserReauthenticationOtpRequiredException', () => {
    describe('constructor', () => {
        it('declares the user module contract', () => {
            const exception = new UserReauthenticationOtpRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: 51029,
                statusCodeKey: 'reauthenticationOtpRequired',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.reauthenticationOtpRequired',
            });
            expect(EnumUserStatusCodeError[exception.statusCode]).toBe(
                'reauthenticationOtpRequired'
            );
        });
    });
});
