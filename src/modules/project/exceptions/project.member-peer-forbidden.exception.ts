import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';

/**
 * Raised when the caller may not act on that project member.
 * @public
 */
export class ProjectMemberPeerForbiddenException extends AppBaseException {
    readonly module = 'project';
    readonly statusCode = EnumProjectStatusCodeError.memberPeerForbidden;
    readonly statusCodeKey = EnumProjectStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('project.error.memberPeerForbidden');
    }
}
