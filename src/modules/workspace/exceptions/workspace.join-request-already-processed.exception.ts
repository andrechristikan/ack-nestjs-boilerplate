import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

/**
 * Raised when a workspace join request is no longer pending.
 * @public
 */
export class WorkspaceJoinRequestAlreadyProcessedException extends AppBaseException {
    readonly module = 'workspace';
    readonly statusCode =
        EnumWorkspaceStatusCodeError.joinRequestAlreadyProcessed;
    readonly statusCodeKey = EnumWorkspaceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('workspace.error.joinRequestAlreadyProcessed');
    }
}
