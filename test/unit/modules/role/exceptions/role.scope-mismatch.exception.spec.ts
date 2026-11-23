import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';

describe('RoleScopeMismatchException', () => {
    describe('constructor', () => {
        it('declares the role module contract for a role of the wrong scope', () => {
            const exception = new RoleScopeMismatchException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.scopeMismatch,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.scopeMismatch
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'role.error.scopeMismatch',
            });
        });
    });
});
