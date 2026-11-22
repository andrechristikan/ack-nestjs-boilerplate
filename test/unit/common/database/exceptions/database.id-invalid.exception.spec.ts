import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseIdInvalidException } from '@common/database/exceptions/database.id-invalid.exception';

describe('DatabaseIdInvalidException', () => {
    describe('constructor', () => {
        it('declares the database module contract for a malformed identifier', () => {
            const exception = new DatabaseIdInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'database',
                statusCode: EnumDatabaseStatusCodeError.idInvalid,
                statusCodeKey:
                    EnumDatabaseStatusCodeError[
                        EnumDatabaseStatusCodeError.idInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'database.error.idInvalid',
            });
        });
    });
});
