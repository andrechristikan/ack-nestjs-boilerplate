import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';

describe('RoleExistException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a duplicate role name', () => {
            const exception = new RoleExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
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
});
