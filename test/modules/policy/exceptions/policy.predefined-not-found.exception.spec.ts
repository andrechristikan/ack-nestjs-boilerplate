import { HttpStatus } from '@nestjs/common';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';

describe('PolicyPredefinedNotFoundException', () => {
    it('exposes the missing predefined policy error contract', () => {
        const exception = new PolicyPredefinedNotFoundException();

        expect(exception).toMatchObject({
            module: 'policy',
            statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
            statusCodeKey:
                EnumPolicyStatusCodeError[
                    EnumPolicyStatusCodeError.predefinedNotFound
                ],
            httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
            messagePath: 'policy.error.predefinedNotFound',
        });
    });
});
