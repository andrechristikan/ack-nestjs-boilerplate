import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationInvalidPerPageException } from '@common/pagination/exceptions/pagination.invalid-per-page.exception';

describe('PaginationInvalidPerPageException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a perPage that is not a valid integer', () => {
            const exception = new PaginationInvalidPerPageException(100);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPerPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPerPage
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.invalidPerPage',
                messageProperties: { maxPerPage: 100 },
            });
        });
    });
});
