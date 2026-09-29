import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RolePredefinedNotFoundException } from '@modules/role/exceptions/role.predefined-not-found.exception';

describe('RolePredefinedNotFoundException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a guard declared with no role type', () => {
            const exception = new RolePredefinedNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.predefinedNotFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.predefinedNotFound
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'role.error.predefinedNotFound',
            });
        });
    });
});
