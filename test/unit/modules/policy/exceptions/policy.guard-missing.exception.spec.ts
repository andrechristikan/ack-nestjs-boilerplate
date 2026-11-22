import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyGuardMissingException } from '@modules/policy/exceptions/policy.guard-missing.exception';

describe('PolicyGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a request the role guard left without stored policies', () => {
            const exception = new PolicyGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.guardMissing
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'policy.error.guardMissing',
            });
        });
    });
});
