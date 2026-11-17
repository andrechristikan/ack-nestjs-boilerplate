import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaAttemptMaxException } from '@modules/mfa/exceptions/mfa.attempt-max.exception';

describe('MfaAttemptMaxException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for a spent attempt budget', () => {
            const exception = new MfaAttemptMaxException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.attemptMax,
                statusCodeKey:
                    EnumMfaStatusCodeError[EnumMfaStatusCodeError.attemptMax],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'mfa.error.attemptMax',
            });
        });
    });
});
