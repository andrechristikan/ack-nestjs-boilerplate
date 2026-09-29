import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';

describe('RoleNotFoundException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a missing role', () => {
            const exception = new RoleNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
        });
    });
});
