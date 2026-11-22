import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';

describe('ProjectSlugAlreadyExistsException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a slug already taken in the workspace', () => {
            const exception = new ProjectSlugAlreadyExistsException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugAlreadyExists,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugAlreadyExists
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'project.error.slugAlreadyExists',
            });
        });
    });
});
