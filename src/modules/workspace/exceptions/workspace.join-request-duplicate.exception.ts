import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Raised when the user already has a pending join request.
 * @public
 */
export class WorkspaceJoinRequestDuplicateException extends AppBaseException {
    readonly module = 'workspace';
    readonly statusCode = EnumWorkspaceStatusCodeError.joinRequestDuplicate;
    readonly statusCodeKey = EnumWorkspaceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('workspace.error.joinRequestDuplicate');
    }
}
