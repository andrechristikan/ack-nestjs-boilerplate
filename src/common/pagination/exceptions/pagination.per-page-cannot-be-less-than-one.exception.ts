import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

export class PaginationPerPageCannotBeLessThanOneException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.perPageCannotBeLessThanOne;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(receivedPerPage: number) {
        super('pagination.error.perPageCannotBeLessThanOne', { messageProperties: { minPerPage: 1, receivedPerPage } });
    }
}
