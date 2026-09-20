import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Raised when `page` is not a positive integer within the maximum.
 * @public
 */
export class PaginationInvalidPageException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.invalidPage;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(maxPage: number) {
        super('pagination.error.invalidPage', {
            messageProperties: { maxPage },
        });
    }
}
