import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';

/**
 * Raised when `orderBy` names a field the route does not allow.
 * @public
 */
export class PaginationOrderByNotAllowedException extends AppBaseException {
    readonly module = 'pagination';
    readonly statusCode = EnumPaginationStatusCodeError.orderByNotAllowed;
    readonly statusCodeKey = EnumPaginationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(allowedFields: string) {
        super('pagination.error.orderByNotAllowed', {
            messageProperties: { allowedFields },
        });
    }
}
