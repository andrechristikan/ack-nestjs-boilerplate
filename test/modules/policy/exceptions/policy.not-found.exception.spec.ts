import { HttpStatus } from '@nestjs/common';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';

describe('PolicyNotFoundException', () => {
    it('exposes the policy not-found error contract', () => {
        const exception = new PolicyNotFoundException();

        expect(exception).toMatchObject({
            module: 'policy',
            statusCode: EnumPolicyStatusCodeError.notFound,
            statusCodeKey:
                EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.notFound],
            httpStatus: HttpStatus.NOT_FOUND,
            messagePath: 'policy.error.notFound',
        });
    });
});
