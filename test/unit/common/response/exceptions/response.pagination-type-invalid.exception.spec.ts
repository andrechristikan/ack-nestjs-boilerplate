import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import { ResponsePaginationTypeInvalidException } from '@common/response/exceptions/response.pagination-type-invalid.exception';

describe('ResponsePaginationTypeInvalidException', () => {
    describe('constructor', () => {
        it('declares the response module contract for an invalid pagination type', () => {
            const exception = new ResponsePaginationTypeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationTypeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationTypeInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'response.error.paginationTypeInvalid',
            });
        });
    });
});
