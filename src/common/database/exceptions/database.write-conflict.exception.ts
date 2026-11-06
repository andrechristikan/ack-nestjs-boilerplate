import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';

/** @public */
export class DatabaseWriteConflictException extends AppBaseException {
    readonly module = 'database';
    readonly statusCode = EnumDatabaseStatusCodeError.writeConflict;
    readonly statusCodeKey = EnumDatabaseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('database.error.writeConflict');
    }
}
