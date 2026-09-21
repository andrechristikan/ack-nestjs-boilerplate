import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/**
 * Raised when an exported file would exceed the maximum size.
 * @public
 */
export class FileExceedMaxSizeExportException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.exceedMaxSizeExport;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('file.error.exceedMaxSizeExport');
    }
}
