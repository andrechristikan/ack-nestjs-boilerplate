import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';

describe('ProjectMemberAlreadyAssignedException', () => {
    describe('constructor', () => {
        it('declares the project module contract for an already assigned member', () => {
            const exception = new ProjectMemberAlreadyAssignedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberAlreadyAssigned,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberAlreadyAssigned
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'project.error.memberAlreadyAssigned',
            });
        });
    });
});
