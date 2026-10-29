import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleSelfForbiddenException } from '@modules/role/exceptions/role.self-forbidden.exception';

describe('RoleSelfForbiddenException', () => {
    describe('constructor', () => {
        it('declares the role module contract with a 403 answer', () => {
            const exception = new RoleSelfForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.selfForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.selfForbidden',
            });
        });
    });
});
