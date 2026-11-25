import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteReferenceExistException } from '@modules/workspace/exceptions/workspace.invite-reference-exist.exception';

describe('WorkspaceInviteReferenceExistException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract', () => {
            const exception = new WorkspaceInviteReferenceExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: 51626,
                statusCodeKey: 'inviteReferenceExist',
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'workspace.error.inviteReferenceExist',
            });
            expect(EnumWorkspaceStatusCodeError[exception.statusCode]).toBe(
                'inviteReferenceExist'
            );
        });
    });
});
