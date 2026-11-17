import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaTotpSetupRequiredException } from '@modules/mfa/exceptions/mfa.totp-setup-required.exception';

describe('MfaTotpSetupRequiredException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for TOTP setup that was not started', () => {
            const exception = new MfaTotpSetupRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.totpSetupRequired,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.totpSetupRequired
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.totpSetupRequired',
            });
        });
    });
});
