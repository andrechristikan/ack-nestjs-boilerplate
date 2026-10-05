import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';

describe('WorkspaceMemberNotFoundException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a missing workspace member', () => {
            const exception = new WorkspaceMemberNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'workspace.error.memberNotFound',
            });
        });
    });
});
