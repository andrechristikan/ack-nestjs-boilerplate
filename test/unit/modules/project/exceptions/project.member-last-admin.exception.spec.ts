import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberLastAdminException } from '@modules/project/exceptions/project.member-last-admin.exception';

describe('ProjectMemberLastAdminException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a change that would leave no admin', () => {
            const exception = new ProjectMemberLastAdminException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberLastAdmin,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberLastAdmin
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'project.error.memberLastAdmin',
            });
        });
    });
});
