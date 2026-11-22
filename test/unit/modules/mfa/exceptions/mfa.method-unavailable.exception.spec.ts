import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';

describe('MfaMethodUnavailableException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a method the user cannot use', () => {
            const exception = new MfaMethodUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.methodUnavailable,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.methodUnavailable
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.methodUnavailable',
            });
        });
    });
});
