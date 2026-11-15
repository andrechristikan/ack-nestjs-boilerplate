import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleHasPoliciesException } from '@modules/role/exceptions/role.has-policies.exception';

describe('RoleHasPoliciesException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a role holding policies', () => {
            const exception = new RoleHasPoliciesException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.hasPolicies,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.hasPolicies
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'role.error.hasPolicies',
            });
        });
    });
});
