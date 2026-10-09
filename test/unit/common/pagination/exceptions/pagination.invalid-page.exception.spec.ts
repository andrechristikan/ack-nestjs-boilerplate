import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';

describe('PaginationInvalidPageException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a page that is not a positive integer', () => {
            const exception = new PaginationInvalidPageException(20);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPage
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.invalidPage',
                messageProperties: { maxPage: 20 },
            });
        });
    });
});
