import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaPasskeyInvalidException } from '@modules/mfa/exceptions/mfa.passkey-invalid.exception';

describe('MfaPasskeyInvalidException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a passkey whose verification failed', () => {
            const exception = new MfaPasskeyInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.passkeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'mfa.error.passkeyInvalid',
            });
        });
    });
});
