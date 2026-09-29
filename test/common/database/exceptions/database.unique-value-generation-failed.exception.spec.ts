import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';

describe('DatabaseUniqueValueGenerationFailedException', () => {
    describe('constructor', () => {
        it('declares the database module contract for an exhausted unique-value budget', () => {
            const exception =
                new DatabaseUniqueValueGenerationFailedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.uniqueValueGenerationFailed
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
        });
    });
});
