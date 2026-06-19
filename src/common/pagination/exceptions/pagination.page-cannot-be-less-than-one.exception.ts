import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

export class PaginationPageCannotBeLessThanOneException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.pageCannotBeLessThanOne;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(receivedPage: number) {
        super('pagination.error.pageCannotBeLessThanOne', { messageProperties: { minPage: 1, receivedPage } });
    }
}
