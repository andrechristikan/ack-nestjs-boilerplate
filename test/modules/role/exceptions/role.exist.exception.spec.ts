import { HttpStatus } from '@nestjs/common';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';

describe('RoleExistException', () => {
    it('exposes the role exist error contract', () => {
        const exception = new RoleExistException();

        expect(exception).toMatchObject({
            module: 'role',
            statusCode: EnumRoleStatusCodeError.exist,
            statusCodeKey:
                EnumRoleStatusCodeError[EnumRoleStatusCodeError.exist],
            httpStatus: HttpStatus.CONFLICT,
            messagePath: 'role.error.exist',
        });
    });
});
