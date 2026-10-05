import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationOrderByNotAllowedException } from '@common/pagination/exceptions/pagination.order-by-not-allowed.exception';

describe('PaginationOrderByNotAllowedException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for an orderBy field the route does not allow', () => {
            const exception = new PaginationOrderByNotAllowedException(
                'name, createdAt'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.orderByNotAllowed
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.orderByNotAllowed',
                messageProperties: { allowedFields: 'name, createdAt' },
            });
        });
    });
});
