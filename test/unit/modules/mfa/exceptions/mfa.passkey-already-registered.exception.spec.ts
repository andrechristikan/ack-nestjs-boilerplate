import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaPasskeyAlreadyRegisteredException } from '@modules/mfa/exceptions/mfa.passkey-already-registered.exception';

describe('MfaPasskeyAlreadyRegisteredException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a passkey that is already registered', () => {
            const exception = new MfaPasskeyAlreadyRegisteredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyAlreadyRegistered,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.passkeyAlreadyRegistered
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'mfa.error.passkeyAlreadyRegistered',
            });
        });
    });
});
