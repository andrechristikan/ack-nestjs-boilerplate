import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleImmutableException } from '@modules/role/exceptions/role.immutable.exception';

describe('RoleImmutableException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a protected role', () => {
            const exception = new RoleImmutableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.immutable,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.immutable],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'role.error.immutable',
            });
        });
    });
});
