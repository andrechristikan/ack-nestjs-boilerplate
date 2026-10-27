import { HttpStatus } from '@nestjs/common';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RolePredefinedException } from '@modules/role/exceptions/role.predefined.exception';

describe('RolePredefinedException', () => {
    it('exposes the role predefined error contract', () => {
        const exception = new RolePredefinedException();

        expect(exception).toMatchObject({
            module: 'role',
            statusCode: EnumRoleStatusCodeError.predefined,
            statusCodeKey:
                EnumRoleStatusCodeError[EnumRoleStatusCodeError.predefined],
            httpStatus: HttpStatus.FORBIDDEN,
            messagePath: 'role.error.predefined',
        });
    });
});
