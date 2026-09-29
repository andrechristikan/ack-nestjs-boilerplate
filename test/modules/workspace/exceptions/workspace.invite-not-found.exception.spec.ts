import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';

describe('WorkspaceInviteNotFoundException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a missing invite', () => {
            const exception = new WorkspaceInviteNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'workspace.error.inviteNotFound',
            });
        });
    });
});
