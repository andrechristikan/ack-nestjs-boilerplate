import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';

describe('PolicyExistException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for an already-granted subject', () => {
            const exception = new PolicyExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.exist],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'policy.error.exist',
            });
        });
    });
});
