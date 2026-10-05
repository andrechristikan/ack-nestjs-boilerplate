import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('PolicyForbiddenException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a missing required policy', () => {
            const exception = new PolicyForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.forbidden,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.forbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'policy.error.forbidden',
            });
        });
    });
});
