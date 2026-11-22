import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';

describe('WorkspaceGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a request the workspace guard left without a stored workspace', () => {
            const exception = new WorkspaceGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.guardMissing
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'workspace.error.guardMissing',
            });
        });
    });
});
