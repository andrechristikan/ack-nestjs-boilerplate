import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationFailedToEncodeCursorException } from '@common/pagination/exceptions/pagination.failed-to-encode-cursor.exception';

describe('PaginationFailedToEncodeCursorException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for a cursor that cannot be encoded', () => {
            const exception = new PaginationFailedToEncodeCursorException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.failedToEncodeCursor,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.failedToEncodeCursor
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.failedToEncodeCursor',
            });
        });
    });
});
