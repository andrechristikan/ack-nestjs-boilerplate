import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/**
 * Raised when an import carries more rows than allowed.
 * @public
 */
export class FileExceedMaxDataImportException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.exceedMaxDataImport;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('file.error.exceedMaxDataImport');
    }
}
