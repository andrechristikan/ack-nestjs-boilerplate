import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';

describe('WorkspaceMemberAlreadyExistsException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract', () => {
            const exception = new WorkspaceMemberAlreadyExistsException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: 51623,
                statusCodeKey: 'memberAlreadyExists',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.memberAlreadyExists',
            });
            expect(EnumWorkspaceStatusCodeError[exception.statusCode]).toBe(
                'memberAlreadyExists'
            );
        });
    });
});
