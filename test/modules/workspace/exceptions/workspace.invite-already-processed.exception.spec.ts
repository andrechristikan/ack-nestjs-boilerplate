import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';

describe('WorkspaceInviteAlreadyProcessedException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for an invite no longer pending', () => {
            const exception = new WorkspaceInviteAlreadyProcessedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteAlreadyProcessed
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
        });
    });
});
