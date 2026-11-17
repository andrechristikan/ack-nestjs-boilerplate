import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';

describe('MfaChallengeInvalidException', () => {
    describe('constructor', () => {
        it('declares the mfa module contract for an invalid or expired challenge', () => {
            const exception = new MfaChallengeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
                statusCodeKey:
                    EnumMfaStatusCodeError[
                        EnumMfaStatusCodeError.challengeInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'mfa.error.challengeInvalid',
            });
        });
    });
});
