import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';

describe('DatabaseWriteConflictException', () => {
    describe('constructor', () => {
        it('declares the database module contract for a write conflict', () => {
            const exception = new DatabaseWriteConflictException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'database',
                statusCode: EnumDatabaseStatusCodeError.writeConflict,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.writeConflict
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'database.error.writeConflict',
            });
        });
    });
});
