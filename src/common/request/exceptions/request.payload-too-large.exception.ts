import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Raised when a request body runs past its configured size limit.
 * @public
 */
export class RequestPayloadTooLargeException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.payloadTooLarge;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.PAYLOAD_TOO_LARGE;

    constructor() {
        super('request.error.payloadTooLarge');
    }
}
