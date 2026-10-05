import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import { ResponsePaginationShapeInvalidException } from '@common/response/exceptions/response.pagination-shape-invalid.exception';

describe('ResponsePaginationShapeInvalidException', () => {
    describe('constructor', () => {
        it('declares the response module contract for an invalid pagination shape', () => {
            const exception = new ResponsePaginationShapeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.paginationShapeInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.paginationShapeInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'response.error.paginationShapeInvalid',
            });
        });
    });
});
