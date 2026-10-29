import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';

describe('RoleRankForbiddenException', () => {
    describe('constructor', () => {
        it('declares the role module contract with a 403 answer', () => {
            const exception = new RoleRankForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.rankForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.rankForbidden',
            });
        });
    });
});
