import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';

describe('ProjectNotFoundException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a missing project', () => {
            const exception = new ProjectNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.notFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'project.error.notFound',
            });
        });
    });
});
