import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationPerPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.per-page-cannot-be-less-than-one.exception';

describe('PaginationPerPageCannotBeLessThanOneException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a perPage below the minimum', () => {
            const exception = new PaginationPerPageCannotBeLessThanOneException(
                0
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.perPageCannotBeLessThanOne
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.perPageCannotBeLessThanOne',
                messageProperties: { minPerPage: 1, receivedPerPage: 0 },
            });
        });
    });
});
