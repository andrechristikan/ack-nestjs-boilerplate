import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Raised when a request body carries an encoding or media type the parser rejects.
 * @public
 */
export class RequestUnsupportedMediaTypeException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.unsupportedMediaType;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNSUPPORTED_MEDIA_TYPE;

    constructor() {
        super('request.error.unsupportedMediaType');
    }
}
