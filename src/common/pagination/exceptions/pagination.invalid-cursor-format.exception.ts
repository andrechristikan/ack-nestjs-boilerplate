import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Raised when a pagination cursor is not in the expected format.
 * @public
 */
export class PaginationInvalidCursorFormatException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.invalidCursorFormat;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(format?: string) {
        super(
            'pagination.error.invalidCursorFormat',
            format !== undefined ? { messageProperties: { format } } : undefined
        );
    }
}
