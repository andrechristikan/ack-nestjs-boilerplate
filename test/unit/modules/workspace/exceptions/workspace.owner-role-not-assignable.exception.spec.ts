import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceOwnerRoleNotAssignableException } from '@modules/workspace/exceptions/workspace.owner-role-not-assignable.exception';

describe('WorkspaceOwnerRoleNotAssignableException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for the owner role handed out by a role update', () => {
            const exception = new WorkspaceOwnerRoleNotAssignableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.ownerRoleNotAssignable,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.ownerRoleNotAssignable
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.ownerRoleNotAssignable',
            });
        });
    });
});
