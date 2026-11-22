import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';

describe('ProjectSlugInvalidException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a slug breaking the allowed pattern', () => {
            const exception = new ProjectSlugInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.slugInvalid,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.slugInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'project.error.slugInvalid',
            });
        });
    });
});
