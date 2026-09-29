import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthTwoFactorBackupCodeRequiredException } from '@modules/auth/exceptions/auth.two-factor-backup-code-required.exception';

describe('AuthTwoFactorBackupCodeRequiredException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a missing backup code on setup', () => {
            const exception = new AuthTwoFactorBackupCodeRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorBackupCodeRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorBackupCodeRequired
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'auth.error.twoFactorBackupCodeRequired',
            });
        });
    });
});
