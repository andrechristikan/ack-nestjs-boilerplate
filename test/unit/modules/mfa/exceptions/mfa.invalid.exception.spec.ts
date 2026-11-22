import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';

describe('MfaInvalidException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a wrong multi-factor authentication code', () => {
            const exception = new MfaInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.invalid,
                statusCodeKey:
                    EnumMfaStatusCodeError[EnumMfaStatusCodeError.invalid],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'mfa.error.invalid',
            });
        });
    });
});
