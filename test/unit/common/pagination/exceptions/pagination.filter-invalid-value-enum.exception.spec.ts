import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationFilterInvalidValueEnumException } from '@common/pagination/exceptions/pagination.filter-invalid-value-enum.exception';

describe('PaginationFilterInvalidValueEnumException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for an enum filter value outside the allowed set', () => {
            const exception = new PaginationFilterInvalidValueEnumException(
                'status',
                'active, inactive'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.filterInvalidValue
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.filterInvalidValueEnum',
                messageProperties: {
                    property: 'status',
                    allowedValues: 'active, inactive',
                },
            });
        });
    });
});
