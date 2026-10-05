import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';

describe('WorkspaceRoleForbiddenException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a caller lacking the required role', () => {
            const exception = new WorkspaceRoleForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.roleForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'workspace.error.roleForbidden',
            });
        });
    });
});
