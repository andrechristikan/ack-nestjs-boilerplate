import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Raised when the caller lacks the workspace role the route requires.
 * @public
 */
export class WorkspaceRoleForbiddenException extends AppBaseException {
    readonly module = 'workspace';
    readonly statusCode = EnumWorkspaceStatusCodeError.roleForbidden;
    readonly statusCodeKey = EnumWorkspaceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('workspace.error.roleForbidden');
    }
}
