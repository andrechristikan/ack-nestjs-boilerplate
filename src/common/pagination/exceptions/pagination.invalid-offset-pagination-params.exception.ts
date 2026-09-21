import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Raised when offset pagination parameters are invalid.
 * @public
 */
export class PaginationInvalidOffsetPaginationParamsException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode =
        EnumPaginationStatusCodeError.invalidOffsetPaginationParams;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('pagination.error.invalidOffsetPaginationParams');
    }
}
