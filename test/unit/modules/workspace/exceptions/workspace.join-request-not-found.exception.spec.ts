import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';

describe('WorkspaceJoinRequestNotFoundException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a missing join request', () => {
            const exception = new WorkspaceJoinRequestNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.joinRequestNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'workspace.error.joinRequestNotFound',
            });
        });
    });
});
