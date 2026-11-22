import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseTransactionExpiredException } from '@common/database/exceptions/database.transaction-expired.exception';

describe('DatabaseTransactionExpiredException', () => {
    describe('constructor', () => {
        it('declares the database module contract for an expired transaction', () => {
            const exception = new DatabaseTransactionExpiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'database',
                statusCode: EnumDatabaseStatusCodeError.transactionExpired,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.transactionExpired
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'database.error.transactionExpired',
            });
        });
    });
});
