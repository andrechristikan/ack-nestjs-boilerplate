import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';

describe('DatabaseUnavailableException', () => {
    describe('constructor', () => {
        it('declares the database module contract for an unreachable MongoDB', () => {
            const exception = new DatabaseUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'database',
                statusCode: 52800,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.unavailable
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'database.error.unavailable',
                rawError: null,
            });
            expect(exception.statusCodeKey).toBe('unavailable');
        });

        it('carries the caught error as rawError and cause', () => {
            const error = new Error('Server selection timeout');

            const exception = new DatabaseUnavailableException(error);

            expect(exception).toMatchObject({
                rawError: error,
                cause: error,
            });
        });
    });
});
