import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';

describe('ProjectMemberNotFoundException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a missing project member', () => {
            const exception = new ProjectMemberNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberNotFound,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'project.error.memberNotFound',
            });
        });
    });
});
