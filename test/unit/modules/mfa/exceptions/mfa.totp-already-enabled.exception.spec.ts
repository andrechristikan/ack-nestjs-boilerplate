import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaTotpAlreadyEnabledException } from '@modules/mfa/exceptions/mfa.totp-already-enabled.exception';

describe('MfaTotpAlreadyEnabledException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for TOTP that is already enabled', () => {
            const exception = new MfaTotpAlreadyEnabledException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.totpAlreadyEnabled,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.totpAlreadyEnabled
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.totpAlreadyEnabled',
            });
        });
    });
});
