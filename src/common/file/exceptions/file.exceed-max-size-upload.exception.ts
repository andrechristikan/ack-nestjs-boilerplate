import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/**
 * Raised when an uploaded file exceeds the maximum size.
 * @public
 */
export class FileExceedMaxSizeUploadException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.exceedMaxSizeUpload;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.PAYLOAD_TOO_LARGE;

    constructor() {
        super('file.error.exceedMaxSizeUpload');
    }
}
