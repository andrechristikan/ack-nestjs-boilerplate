import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';

describe('WorkspaceSlugAlreadyExistsException', () => {
    describe('constructor', () => {
        it('declares the workspace module contract for a taken slug', () => {
            const exception = new WorkspaceSlugAlreadyExistsException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.slugAlreadyExists
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'workspace.error.slugAlreadyExists',
            });
        });
    });
});
