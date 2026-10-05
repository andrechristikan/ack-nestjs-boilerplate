import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';

describe('PaginationPageExceedsMaximumException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a page exceeding the maximum', () => {
            const exception = new PaginationPageExceedsMaximumException(20, 21);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.pageExceedsMaximum
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.pageExceedsMaximum',
                messageProperties: { maxPage: 20, receivedPage: 21 },
            });
        });
    });
});
