import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Raised when the requested workspace join request does not exist.
 * @public
 */
export class WorkspaceJoinRequestNotFoundException extends AppBaseException {
    readonly module = 'workspace';
    readonly statusCode = EnumWorkspaceStatusCodeError.joinRequestNotFound;
    readonly statusCodeKey = EnumWorkspaceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('workspace.error.joinRequestNotFound');
    }
}
