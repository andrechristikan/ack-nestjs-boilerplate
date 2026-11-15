import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyRoleTypeInvalidException } from '@modules/policy/exceptions/policy.role-type-invalid.exception';

describe('PolicyRoleTypeInvalidException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a user-type role', () => {
            const exception = new PolicyRoleTypeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.roleTypeInvalid,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.roleTypeInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'policy.error.roleTypeInvalid',
            });
        });
    });
});
