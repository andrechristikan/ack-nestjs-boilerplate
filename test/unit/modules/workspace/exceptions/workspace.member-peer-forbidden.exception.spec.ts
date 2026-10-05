import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';

describe('WorkspaceMemberPeerForbiddenException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a caller acting on a member it may not touch', () => {
            const exception = new WorkspaceMemberPeerForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberPeerForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'workspace.error.memberPeerForbidden',
            });
        });
    });
});
