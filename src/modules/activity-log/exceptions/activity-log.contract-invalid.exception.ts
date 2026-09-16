import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumActivityLogStatusCodeError } from '@modules/activity-log/enums/activity-log.status-code.enum';

export class ActivityLogContractInvalidException extends AppBaseException {
    readonly module = 'activityLog';
    readonly statusCode = EnumActivityLogStatusCodeError.contractInvalid;
    readonly statusCodeKey = EnumActivityLogStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(rawError?: unknown) {
        super('activityLog.error.contractInvalid', { rawError });
    }
}
