import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';

describe('TermPolicyAlreadyAcceptedException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for an already-accepted policy', () => {
            const exception = new TermPolicyAlreadyAcceptedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.alreadyAccepted
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'termPolicy.error.alreadyAccepted',
            });
        });
    });
});
