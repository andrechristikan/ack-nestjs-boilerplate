import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';

export class ProjectMemberAlreadyAssignedException extends AppBaseException {
    readonly module = 'project';
    readonly statusCode = EnumProjectStatusCodeError.memberAlreadyAssigned;
    readonly statusCodeKey = EnumProjectStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('project.error.memberAlreadyAssigned');
    }
}
