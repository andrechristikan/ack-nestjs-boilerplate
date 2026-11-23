import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';

/** @public */
export class ProjectMemberLastAdminException extends AppBaseException {
    readonly module = 'project';
    readonly statusCode = EnumProjectStatusCodeError.memberLastAdmin;
    readonly statusCodeKey = EnumProjectStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('project.error.memberLastAdmin');
    }
}
