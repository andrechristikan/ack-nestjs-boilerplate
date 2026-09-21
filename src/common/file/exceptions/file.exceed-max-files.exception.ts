import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/**
 * Raised when a request uploads more files than allowed.
 * @public
 */
export class FileExceedMaxFilesException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.exceedMaxFiles;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('file.error.exceedMaxFiles');
    }
}
