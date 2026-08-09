import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

export class WorkspaceInviteRoleRequiredException extends AppBaseException {
    readonly module = 'workspace';
    readonly statusCode = EnumWorkspaceStatusCodeError.inviteRoleRequired;
    readonly statusCodeKey = EnumWorkspaceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('workspace.error.inviteRoleRequired');
    }
}
