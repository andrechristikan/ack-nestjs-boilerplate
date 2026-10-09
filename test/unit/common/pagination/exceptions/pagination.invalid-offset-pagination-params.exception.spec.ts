import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationInvalidOffsetPaginationParamsException } from '@common/pagination/exceptions/pagination.invalid-offset-pagination-params.exception';

describe('PaginationInvalidOffsetPaginationParamsException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for invalid offset pagination parameters', () => {
            const exception =
                new PaginationInvalidOffsetPaginationParamsException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError
                            .invalidOffsetPaginationParams
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.invalidOffsetPaginationParams',
            });
        });
    });
});
