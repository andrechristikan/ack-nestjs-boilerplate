import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';

export abstract class DatabaseUniqueValueGenerationFailedException extends AppBaseException {
    readonly module = 'database';
    readonly statusCode = EnumDatabaseStatusCodeError.uniqueValueGenerationFailed;
    readonly statusCodeKey = EnumDatabaseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('database.error.uniqueValueGenerationFailed');
    }
}
