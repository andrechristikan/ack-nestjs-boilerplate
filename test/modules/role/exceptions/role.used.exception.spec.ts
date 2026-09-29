import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';

describe('RoleUsedException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a role still assigned to users', () => {
            const exception = new RoleUsedException();

            expect(exception).toBeInstanceOf(AppBaseException);
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
});
