import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';

describe('WorkspaceOwnerTransferRequiredException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for an owner deleting their account while a workspace has other members', () => {
            const exception = new WorkspaceOwnerTransferRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.ownerTransferRequired,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.ownerTransferRequired
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.ownerTransferRequired',
            });
        });
    });
});
