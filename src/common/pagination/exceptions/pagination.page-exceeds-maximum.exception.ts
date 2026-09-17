import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Raised when `page` exceeds the maximum page.
 * @public
 */
export class PaginationPageExceedsMaximumException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.pageExceedsMaximum;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(maxPage: number, receivedPage: number) {
        super('pagination.error.pageExceedsMaximum', {
            messageProperties: { maxPage, receivedPage },
        });
    }
}
