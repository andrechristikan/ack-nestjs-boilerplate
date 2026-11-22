import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberGuardMissingException } from '@modules/project/exceptions/project.member-guard-missing.exception';

describe('ProjectMemberGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a request the project member guard left without a stored member', () => {
            const exception = new ProjectMemberGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberGuardMissing,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberGuardMissing
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'project.error.memberGuardMissing',
            });
        });
    });
});
