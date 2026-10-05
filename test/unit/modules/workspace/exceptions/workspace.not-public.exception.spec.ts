import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';

describe('WorkspaceNotPublicException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a join request against a private workspace', () => {
            const exception = new WorkspaceNotPublicException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.notPublic,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.notPublic
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.notPublic',
            });
        });
    });
});
