import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';

/**
 * Raised when the database cannot be reached or its connection pool is exhausted.
 * @public
 */
export class DatabaseUnavailableException extends AppBaseException {
    readonly module = 'database';
    readonly statusCode = EnumDatabaseStatusCodeError.unavailable;
    readonly statusCodeKey = EnumDatabaseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    constructor() {
        super('database.error.unavailable');
    }
}
