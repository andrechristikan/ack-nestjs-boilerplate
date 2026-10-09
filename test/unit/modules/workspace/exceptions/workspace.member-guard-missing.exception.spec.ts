import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberGuardMissingException } from '@modules/workspace/exceptions/workspace.member-guard-missing.exception';

describe('WorkspaceMemberGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a request the workspace member guard left without a stored member', () => {
            const exception = new WorkspaceMemberGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberGuardMissing
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'workspace.error.memberGuardMissing',
            });
        });
    });
});
