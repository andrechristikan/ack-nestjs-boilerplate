import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationInvalidCursorDataException } from '@common/pagination/exceptions/pagination.invalid-cursor-data.exception';

describe('PaginationInvalidCursorDataException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a decoded cursor carrying invalid data', () => {
            const exception = new PaginationInvalidCursorDataException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorData,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorData
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.invalidCursorData',
            });
        });
    });
});
