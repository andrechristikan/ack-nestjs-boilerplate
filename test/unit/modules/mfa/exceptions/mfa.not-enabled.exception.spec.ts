import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaNotEnabledException } from '@modules/mfa/exceptions/mfa.not-enabled.exception';

describe('MfaNotEnabledException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for multi-factor authentication that is not enabled', () => {
            const exception = new MfaNotEnabledException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.notEnabled,
                statusCodeKey:
                    EnumMfaStatusCodeError[EnumMfaStatusCodeError.notEnabled],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.notEnabled',
            });
        });
    });
});
