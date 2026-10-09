import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationInvalidCursorFormatException } from '@common/pagination/exceptions/pagination.invalid-cursor-format.exception';

describe('PaginationInvalidCursorFormatException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract with no format hint', () => {
            const exception = new PaginationInvalidCursorFormatException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorFormat
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.invalidCursorFormat',
                messageProperties: null,
            });
        });

        it('declares the pagination module contract with a format hint', () => {
            const exception = new PaginationInvalidCursorFormatException(
                'URL-safe base64 (A-Za-z0-9_-)'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidCursorFormat
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.invalidCursorFormat',
                messageProperties: { format: 'URL-safe base64 (A-Za-z0-9_-)' },
            });
        });
    });
});
