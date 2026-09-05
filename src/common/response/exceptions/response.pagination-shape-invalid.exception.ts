import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';

/**
 * Raised when a paginated handler returns no payload or a non-array `data`.
 */
export class ResponsePaginationShapeInvalidException extends AppBaseException {
    readonly module = 'response';
    readonly statusCode = EnumResponseStatusCodeError.paginationShapeInvalid;
    readonly statusCodeKey = EnumResponseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('response.error.paginationShapeInvalid');
    }
}
