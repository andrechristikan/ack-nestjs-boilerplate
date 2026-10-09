import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectGuardMissingException } from '@modules/project/exceptions/project.guard-missing.exception';

describe('ProjectGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a request the project guard left without a stored project', () => {
            const exception = new ProjectGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.guardMissing
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'project.error.guardMissing',
            });
        });
    });
});
