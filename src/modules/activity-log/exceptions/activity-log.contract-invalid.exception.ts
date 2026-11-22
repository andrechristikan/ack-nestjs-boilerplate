import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumActivityLogStatusCodeError } from '@modules/activity-log/enums/activity-log.status-code.enum';

/** @public */
export class ActivityLogContractInvalidException extends AppBaseException {
    readonly module = 'activityLog';
    readonly statusCode = EnumActivityLogStatusCodeError.contractInvalid;
    readonly statusCodeKey = EnumActivityLogStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(readonly rawError: unknown = null) {
        super('activityLog.error.contractInvalid', { rawError });
    }
}
