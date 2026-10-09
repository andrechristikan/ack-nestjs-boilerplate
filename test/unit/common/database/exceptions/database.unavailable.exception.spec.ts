import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';

describe('DatabaseUnavailableException', () => {
    describe('constructor', () => {
        it('declares the database module contract for an unreachable database', () => {
            const exception = new DatabaseUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'database',
                statusCode: EnumDatabaseStatusCodeError.unavailable,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.unavailable
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'database.error.unavailable',
            });
        });
    });
});
