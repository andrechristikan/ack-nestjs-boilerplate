import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaPasskeyNotFoundException } from '@modules/mfa/exceptions/mfa.passkey-not-found.exception';

describe('MfaPasskeyNotFoundException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a passkey that is not found', () => {
            const exception = new MfaPasskeyNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyNotFound,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.passkeyNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'mfa.error.passkeyNotFound',
            });
        });
    });
});
