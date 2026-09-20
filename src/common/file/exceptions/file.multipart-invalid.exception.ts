import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/**
 * Raised when a multipart request body is malformed.
 * @public
 */
export class FileMultipartInvalidException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.multipartInvalid;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('file.error.multipartInvalid');
    }
}
