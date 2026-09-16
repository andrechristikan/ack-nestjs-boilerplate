import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';

export class ProjectMemberNotFoundException extends AppBaseException {
    readonly module = 'project';
    readonly statusCode = EnumProjectStatusCodeError.memberNotFound;
    readonly statusCodeKey = EnumProjectStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('project.error.memberNotFound');
    }
}
