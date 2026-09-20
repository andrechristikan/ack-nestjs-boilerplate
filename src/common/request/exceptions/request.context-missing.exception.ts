import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Raised when a param decorator finds no value its guard or middleware should have written.
 * @public
 */
export class RequestContextMissingException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.contextMissing;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(contextKey: string) {
        super('request.error.contextMissing', {
            rawError: new Error(
                `RequestContextMissingException: no value for "${contextKey}"`
            ),
        });
    }
}
