import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';

describe('PaginationPageCannotBeLessThanOneException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a page below the minimum', () => {
            const exception = new PaginationPageCannotBeLessThanOneException(0);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.pageCannotBeLessThanOne
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.pageCannotBeLessThanOne',
                messageProperties: { minPage: 1, receivedPage: 0 },
            });
        });
    });
});
