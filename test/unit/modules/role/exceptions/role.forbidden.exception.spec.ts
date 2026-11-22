import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';

describe('RoleForbiddenException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a disallowed role type', () => {
            const exception = new RoleForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.forbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.forbidden],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.forbidden',
            });
        });
    });
});
