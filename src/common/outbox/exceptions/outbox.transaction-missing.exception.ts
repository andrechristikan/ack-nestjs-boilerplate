import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumOutboxStatusCodeError } from '@common/outbox/enums/outbox.status-code.enum';

/** @public */
export class OutboxTransactionMissingException extends AppBaseException {
    readonly module = 'outbox';
    readonly statusCode = EnumOutboxStatusCodeError.transactionMissing;
    readonly statusCodeKey = EnumOutboxStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('outbox.error.transactionMissing');
    }
}
