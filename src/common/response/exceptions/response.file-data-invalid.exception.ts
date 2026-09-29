import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';

/**
 * Raised when a `@ResponseFile` handler returns no payload, or a `data` field that does not
 * match its extension (a string for csv, a Buffer for pdf).
 * @public
 */
export class ResponseFileDataInvalidException extends AppBaseException {
    readonly module = 'response';
    readonly statusCode = EnumResponseStatusCodeError.fileDataInvalid;
    readonly statusCodeKey = EnumResponseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('response.error.fileDataInvalid');
    }
}
