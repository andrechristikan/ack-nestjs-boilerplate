import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';

describe('WorkspaceInviteDuplicateException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a duplicate pending invite', () => {
            const exception = new WorkspaceInviteDuplicateException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteDuplicate,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteDuplicate
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.inviteDuplicate',
            });
        });
    });
});
