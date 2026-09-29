import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';

describe('WorkspaceMemberForbiddenException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a caller who is not a member', () => {
            const exception = new WorkspaceMemberForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'workspace.error.memberForbidden',
            });
        });
    });
});
