import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationOrderDirectionNotAllowedException } from '@common/pagination/exceptions/pagination.order-direction-not-allowed.exception';

describe('PaginationOrderDirectionNotAllowedException', () => {
    describe('constructor', () => {
        it('declares the pagination module contract for an order direction the route does not allow', () => {
            const exception = new PaginationOrderDirectionNotAllowedException(
                'asc, desc'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.orderDirectionNotAllowed,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.orderDirectionNotAllowed
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'pagination.error.orderDirectionNotAllowed',
                messageProperties: { allowedDirections: 'asc, desc' },
            });
        });
    });
});
