import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';

describe('ProjectRoleForbiddenException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a caller lacking the required role', () => {
            const exception = new ProjectRoleForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.roleForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.roleForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'project.error.roleForbidden',
            });
        });
    });
});
