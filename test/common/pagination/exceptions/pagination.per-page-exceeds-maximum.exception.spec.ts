import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationPerPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.per-page-exceeds-maximum.exception';

describe('PaginationPerPageExceedsMaximumException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a perPage exceeding the maximum', () => {
            const exception = new PaginationPerPageExceedsMaximumException(
                100,
                101
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.perPageExceedsMaximum,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.perPageExceedsMaximum
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.perPageExceedsMaximum',
                messageProperties: { maxPerPage: 100, receivedPerPage: 101 },
            });
        });
    });
});
