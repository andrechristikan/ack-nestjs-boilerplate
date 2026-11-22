import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaPasskeyLimitException } from '@modules/mfa/exceptions/mfa.passkey-limit.exception';

describe('MfaPasskeyLimitException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a passkey list that is full', () => {
            const exception = new MfaPasskeyLimitException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyLimit,
                statusCodeKey:
                    EnumMfaStatusCodeError[EnumMfaStatusCodeError.passkeyLimit],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.passkeyLimit',
            });
        });
    });
});
