import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';

describe('ProjectMemberForbiddenException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a non-member caller', () => {
            const exception = new ProjectMemberForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'project.error.memberForbidden',
            });
        });
    });
});
