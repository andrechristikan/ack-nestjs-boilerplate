import { HttpStatus } from '@nestjs/common';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';

describe('PolicyImmutableException', () => {
    it('exposes the policy immutability error contract', () => {
        const exception = new PolicyImmutableException();

        expect(exception).toMatchObject({
            module: 'policy',
            statusCode: EnumPolicyStatusCodeError.immutable,
            statusCodeKey:
                EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.immutable],
            httpStatus: HttpStatus.FORBIDDEN,
            messagePath: 'policy.error.immutable',
        });
    });
});
