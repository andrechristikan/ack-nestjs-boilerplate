import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

export class PaginationPerPageExceedsMaximumException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.perPageExceedsMaximum;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(maxPerPage: number, receivedPerPage: number) {
        super('pagination.error.perPageExceedsMaximum', { messageProperties: { maxPerPage, receivedPerPage } });
    }
}
