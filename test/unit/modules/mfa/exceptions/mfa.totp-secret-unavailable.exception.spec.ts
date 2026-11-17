import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaTotpSecretUnavailableException } from '@modules/mfa/exceptions/mfa.totp-secret-unavailable.exception';

describe('MfaTotpSecretUnavailableException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for an unreadable TOTP secret', () => {
            const exception = new MfaTotpSecretUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.totpSecretUnavailable,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.totpSecretUnavailable
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'mfa.error.totpSecretUnavailable',
            });
        });
    });
});
