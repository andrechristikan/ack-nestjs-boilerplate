import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Raised when the caller may not act on that workspace member.
 * @public
 */
export class WorkspaceMemberPeerForbiddenException extends AppBaseException {
    readonly module = 'workspace';
    readonly statusCode = EnumWorkspaceStatusCodeError.memberPeerForbidden;
    readonly statusCodeKey = EnumWorkspaceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('workspace.error.memberPeerForbidden');
    }
}
