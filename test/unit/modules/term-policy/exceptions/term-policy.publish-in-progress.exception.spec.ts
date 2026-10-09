import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyPublishInProgressException } from '@modules/term-policy/exceptions/term-policy.publish-in-progress.exception';

describe('TermPolicyPublishInProgressException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a publish job still waiting or running', () => {
            const exception = new TermPolicyPublishInProgressException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.publishInProgress,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.publishInProgress
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'termPolicy.error.publishInProgress',
            });
        });
    });
});
