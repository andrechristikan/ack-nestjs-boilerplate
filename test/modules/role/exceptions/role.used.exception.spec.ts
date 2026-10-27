import { HttpStatus } from '@nestjs/common';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';

describe('RoleUsedException', () => {
    it('exposes the role used error contract', () => {
        const exception = new RoleUsedException();

        expect(exception).toMatchObject({
            module: 'role',
            statusCode: EnumRoleStatusCodeError.used,
            statusCodeKey:
                EnumRoleStatusCodeError[EnumRoleStatusCodeError.used],
            httpStatus: HttpStatus.CONFLICT,
            messagePath: 'role.error.used',
        });
    });
});
