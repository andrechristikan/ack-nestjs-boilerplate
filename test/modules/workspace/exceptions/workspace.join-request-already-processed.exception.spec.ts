import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';

describe('WorkspaceJoinRequestAlreadyProcessedException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a join request no longer pending', () => {
            const exception =
                new WorkspaceJoinRequestAlreadyProcessedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode:
                    EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.joinRequestAlreadyProcessed',
            });
        });
    });
});
