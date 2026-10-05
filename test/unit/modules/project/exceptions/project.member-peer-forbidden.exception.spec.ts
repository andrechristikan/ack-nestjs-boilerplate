import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';

describe('ProjectMemberPeerForbiddenException', () => {
    describe('constructor', () => {
        it('declares the project module contract for a caller acting on a peer member', () => {
            const exception = new ProjectMemberPeerForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.memberPeerForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'project.error.memberPeerForbidden',
            });
        });
    });
});
