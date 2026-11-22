import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';

describe('WorkspaceNotFoundException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a missing workspace', () => {
            const exception = new WorkspaceNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notFound,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'workspace.error.notFound',
            });
        });
    });
});
