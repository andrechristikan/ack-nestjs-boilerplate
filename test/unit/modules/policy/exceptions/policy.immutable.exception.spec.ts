import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';

describe('PolicyImmutableException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a write on the super administrator role policies', () => {
            const exception = new PolicyImmutableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.immutable,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.immutable
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'policy.error.immutable',
            });
        });
    });
});
