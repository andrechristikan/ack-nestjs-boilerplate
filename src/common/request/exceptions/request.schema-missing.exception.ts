import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Raised when a request body reaches a handler with no schema attached.
 * @public
 */
export class RequestSchemaMissingException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.schemaMissing;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('request.error.schemaMissing');
    }
}
