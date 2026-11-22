import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaTotpNotEnabledException } from '@modules/mfa/exceptions/mfa.totp-not-enabled.exception';

describe('MfaTotpNotEnabledException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for TOTP that is not enabled', () => {
            const exception = new MfaTotpNotEnabledException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.totpNotEnabled,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.totpNotEnabled
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.totpNotEnabled',
            });
        });
    });
});
