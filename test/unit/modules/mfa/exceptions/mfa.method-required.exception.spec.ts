import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaMethodRequiredException } from '@modules/mfa/exceptions/mfa.method-required.exception';

describe('MfaMethodRequiredException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a missing method', () => {
            const exception = new MfaMethodRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.methodRequired,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.methodRequired
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'mfa.error.methodRequired',
            });
        });
    });
});
